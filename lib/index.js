
var argv = require('minimist')(process.argv.slice(2))

var fs = require('fs')
var path = require('path')

var request = require('@request/client')
var purest = require('purest')({request, promise: Promise})

var env, config, db, dbpath, twitter

var init = (args = {}) => (
  env = args.env || process.env.NODE_ENV || argv.env || 'development',

  config = (args.config || require(path.resolve(process.cwd(), argv.config)))[env],

  dbpath = !args.db && path.resolve(process.cwd(), argv.db),
  db = args.db || require(dbpath),

  twitter = purest({
    provider: 'twitter',
    config: args.purest || require(
      argv.purest ? path.resolve(process.cwd(), argv.purest) : '../config/purest'),
    key: config.twitter.app.key, secret: config.twitter.app.secret
  }),

  {env, config, db, twitter}
)

var attachment = (item) => ((tweet = item.retweeted_status || item) => ({
  fallback: 'Twitter Activity!',
  color: '#55acee',

  author_name: tweet.user.screen_name,
  author_link: 'https://twitter.com/' + tweet.user.screen_name,
  author_icon: tweet.user.profile_image_url_https,

  text: tweet.entities.user_mentions.reduce((text, mention) =>
    text.replace('@' + mention.screen_name.toLowerCase(),
      '<https://twitter.com/' + mention.screen_name +
      '|@' + mention.screen_name + '>')
  , tweet.text),

  thumb_url: tweet.entities.media && tweet.entities.media[0]
    ? tweet.entities.media[0].media_url_https : '',

  footer: ' <https://twitter.com/' + config.twitter.name + '/status/' + item.id_str +
    '|' + (item.retweeted_status ? 'Retweet' : 'Tweet') + '>',
  footer_icon: 'https://cdn1.iconfinder.com/data/icons/logotypes/32/twitter-128.png',
  ts: new Date(item.created_at).getTime() / 1000
}))()

var get = () => twitter
  .get('statuses/user_timeline')
  .qs({
    user_id: config.twitter.id,
    since_id : db[env].id
  })
  .auth(config.twitter.user.token, config.twitter.user.secret)
  .request()

var post = (attachments) => new Promise((resolve, reject) => {
  request({
    method: 'POST',
    url: config.slack.hook,
    json: {
      username: config.slack.attachment.username,
      icon_url: config.slack.attachment.icon_url,
      channel: config.slack.attachment.channel,
      attachments
    },
    callback: (err, res, body) => (err ? reject(err) : resolve([res, body]))
  })
})

var store = (id) => {
  db[env].id = id
  fs.writeFileSync(dbpath, JSON.stringify(db, null, 2), 'utf8')
}

var check = () =>
  get().then(([res, tweets]) => (
    tweets.length &&

    post(tweets.map(attachment)).then(([res, body]) => (
      store(tweets[0].id_str),
      [res, body]
    ))
  ) || [])

module.exports = {init, attachment, get, post, store, check}
