
const env = process.env.NODE_ENV || 'development'

var config = require('../config/')[env]
config.id = process.env.ID || config.id
config.hook = process.env.HOOK || config.hook
var providers = require('../config/purest')

var fs = require('fs')
var path = require('path')
var db = require('../config/db')

var request = require('@request/client')
var purest = require('purest')({request})
var twitter = purest({provider: 'twitter', config: providers,
  key: config.app.key, secret: config.app.secret})

var last = db[env].feed.id


var attachment = (item) => {
  var tweet = item.retweeted_status || item
  return {
    fallback: 'Incoming WebHook Error!',
    color: '#55acee',

    pretext: '> https://twitter.com/' + config.name + '/status/' + item.id_str,

    author_name: tweet.user.screen_name,
    author_link: 'https://twitter.com/' + tweet.user.screen_name,
    author_icon: tweet.user.profile_image_url_https,

    text: tweet.entities.user_mentions.reduce((text, mention) =>
      text.replace('@' + mention.screen_name.toLowerCase(),
        '<https://twitter.com/' + mention.screen_name +
        '|@' + mention.screen_name + '>')
    , tweet.text),

    footer: item.retweeted_status ? 'Retweet' : 'Tweet',
    footer_icon: 'https://abs.twimg.com/favicons/favicon.ico',
    ts: new Date(item.created_at).getTime() / 1000,

    mrkdwn_in: ['pretext']
  }
}


function check () {
  twitter
    .get('statuses/user_timeline')
    .qs({
      user_id: config.id,
      since_id : last
    })
    .auth(config.user.token, config.user.secret)
    .request((err, res, body) => {
      if (err) {
        console.error(new Date().toString(), err.message, err.stack)
        return
      }
      if (body.length) {
        request({
          method: 'POST',
          url: config.hook,
          json: {
            username: config.attachment.username,
            icon_url: config.attachment.icon_url,
            channel: config.attachment.channel,
            attachments: body.map(attachment)
          },
          callback: (err, res, _body) => {
            if (err) {
              console.error(new Date().toString(), err.message, err.stack)
              return
            }
            console.log(new Date().toString(), res.statusCode, _body)
            last = db[env].feed.id = body[0].id_str
            fs.writeFileSync(path.join(__dirname, '../config/db.json'),
              JSON.stringify(db, null, 2), 'utf8')
          }
        })
      }
    })
}


check()
