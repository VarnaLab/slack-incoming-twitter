
var fs = require('fs')
var request = require('@request/client')
var purest = require('purest')({request, promise: Promise})


var get = ({api, screen_name, since_id}) =>
  api
    .get('statuses/user_timeline')
    .qs({screen_name, since_id})
    .request()
    .then(([res, body]) =>
      res.statusCode !== 200
        ? Promise.reject(new Error(error(res, body)))
        : body
    )
    .then((tweets) =>
      tweets.sort((a, b) =>
        a.id_str < b.id_str ? -1 : a.id_str > b.id_str ? 1 : 0)
    )

var error = (res, body) => [
  res.statusCode,
  res.statusMessage,
  typeof body === 'object' ? JSON.stringify(body) : body
].join(' ')

var hooks = (config) =>
  [].concat(config)
    .map(({hook, username, icon_url, channel}) => [].concat(hook)
      .map((hook) => ({hook, username, icon_url, channel}))
      .reduce((all, hook) => all.concat(hook) || all, []))
    .reduce((all, hook) => all.concat(hook) || all, [])

var post = ({hooks, attachments}) => Promise.all(
  hooks.map((hook) => new Promise((resolve, reject) => {
    request({
      method: 'POST',
      url: hook.hook,
      json: {
        username: hook.username,
        icon_url: hook.icon_url,
        channel: hook.channel,
        attachments,
      },
      callback: (err, res, body) => (
        err ? reject(err) :
        res.statusCode !== 200 ? reject(new Error(error(res, body))) :
        resolve([res, body])
      )
    })
  }))
)

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

  ts: new Date(item.created_at).getTime() / 1000,
}))()

var store = ({db, env, dbpath, last}) => {
  db[env].id = last
  fs.writeFileSync(dbpath, JSON.stringify(db, null, 2), 'utf8')
}

var send = ({db, env, dbpath, config, _purest}) =>
  get({
    api: purest({
      provider: 'twitter',
      config: _purest || require('../config/purest'),
      key: config.twitter.app.key,
      secret: config.twitter.app.secret,
      defaults: {
        oauth: {
          token: config.twitter.user.token,
          secret: config.twitter.user.secret
        }
      }
    }),
    screen_name: config.twitter.id,
    since_id: db[env].id,
  })
  .then((tweets) => !tweets.length ? [] :
    post({
      hooks: hooks(config.slack),
      attachments: tweets.map(attachment(config.twitter.id)),
    })
    .then((responses) => (
      store({
        db,
        env,
        dbpath,
        last: tweets[0].id_str
      }),
      responses
    ))
  )


module.exports = Object.assign(send, {
  get, error, hooks, post, attachment, store, send
})
