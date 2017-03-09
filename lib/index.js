
var fs = require('fs')
var request = require('@request/client')
var purest = require('purest')({request, promise: Promise})

var attachment = (id) => (item) => ((tweet = item.retweeted_status || item) => ({
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

  footer: ' <https://twitter.com/' + id + '/status/' + item.id_str +
    '|' + (item.retweeted_status ? 'Retweet' : 'Tweet') + '>',
  footer_icon: 'https://cdn1.iconfinder.com/data/icons/logotypes/32/twitter-128.png',
  ts: new Date(item.created_at).getTime() / 1000
}))()

var get = (twitter, id, since_id) => twitter
  .get('statuses/user_timeline')
  .qs({
    screen_name: id,
    since_id : since_id
  })
  .request()
  .then(([res, tweets]) => ((
    _attachment = attachment(id)) => ({
      last: tweets[0].id_str,
      attachments: tweets
        .sort((a, b) => a.id_str < b.id_str ? -1 : a.id_str > b.id_str ? 1 : 0)
        .map(_attachment)
    }))())

var hooks = (config) =>
  [].concat(config)
    .map(({hook, username, icon_url, channel}) => [].concat(hook)
      .map((hook) => ({hook, username, icon_url, channel}))
      .reduce((all, hook) => all.concat(hook) || all, []))
    .reduce((all, hook) => all.concat(hook) || all, [])

var post = (hooks, attachments) => Promise.all(
  hooks.map((hook) => new Promise((resolve, reject) => {
    request({
      method: 'POST',
      url: hook.hook,
      json: {
        username: hook.username,
        icon_url: hook.icon_url,
        channel: hook.channel,
        attachments
      },
      callback: (err, res, body) => (err ? reject(err) : resolve([res, body]))
    })
  }))
)

var store = (env, db, dbpath, id) => {
  db[env].id = id
  fs.writeFileSync(dbpath, JSON.stringify(db, null, 2), 'utf8')
}

var hook = ({env, config, db, dbpath, _purest, filter}) => ((
  twitter = purest({
    provider: 'twitter',
    config: _purest || require('../config/purest'),
    key: config.twitter.app.key, secret: config.twitter.app.secret,
    defaults: {
      oauth: {token: config.twitter.user.token, secret: config.twitter.user.secret}
    }
  }),
  _attachment = attachment(config.twitter.id)
  ) =>
    get(twitter, config.twitter.id, db[env].id).then(({attachments, last}) =>
      attachments.length
      ? post(hooks(config.slack), attachments).then((responses) => (
          store(env, db, dbpath, last),
          responses
        ))
      : []
    )
  )()

module.exports = Object.assign(hook, {
  attachment, get, hooks, post, store
})
