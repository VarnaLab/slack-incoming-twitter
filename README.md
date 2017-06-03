
# slack-incoming-twitter

Slack Incoming WebHook for Twitter


# Install

```bash
npm install -g slack-incoming-twitter
```


# CLI

```bash
slack-incoming-twitter \
  --config /path/to/config.json \
  --db /path/to/db.json \
  --env environment
```


# config.json

```json
{
  "development": {
    "twitter": {
      "id": "[Organization Screen Name]",
      "app": {
        "key": "[OAuth Consumer Key]",
        "secret": "[OAuth Consumer Secret]"
      },
      "user": {
        "token": "[OAuth Access Token]",
        "secret": "[OAuth Access Secret]"
      }
    },
    "slack": { "see below" }
  }
}
```

The `username`, `icon_url` and `channel` keys are optional and take effect only if the hook is a *Custom Integration*. These 3 keys have no effect for bundled *OAuth Apps*.

> Single hook:

```json
"slack": {
  "hook": "[Hook URL]",
  "username": "[App Name]",
  "icon_url": "[App Avatar]",
  "channel": "[Target #channel or @user]"
}
```

> Multiple hooks with a common `username`, `icon_url` and `channel` configuration:

```json
"slack": {
  "hook": [
    "[Hook URL 1]",
    "[Hook URL 2]"
  ],
  "username": "[App Name]",
  "icon_url": "[App Avatar]",
  "channel": "[Target #channel or @user]"
}
```

> Multiple hooks with separate `username`, `icon_url` and `channel` configuration:

```json
"slack": [
  {
    "hook": "[Hook URL 1]",
    "username": "[App Name]",
    "icon_url": "[App Avatar]",
    "channel": "[Target #channel or @user]"
  },
  {
    "hook": [
      "[Hook URL 2]",
      "[Hook URL 3]"
    ],
    "username": "[App Name]",
    "icon_url": "[App Avatar]",
    "channel": "[Target #channel or @user]"
  }
]
```


# db.json

```js
{
  "development": {
    "id": "0"
  },
  "production": {
    "id": "0"
  }
}
```


# Crontab

```bash
# Run on every 15 min:
*/15 * * * * node slack-incoming-twitter [params] >> slack-incoming-twitter.log
```


# API

```js
var hook = require('slack-incoming-twitter')

hook({
  config: require('config.json'),
  db: require('db.json'),
  dpath: '/absolute/path/to/db.json',
  env: 'development'
})
.then((responses) => {
  responses.forEach(([res, body]) => {
    console.log(new Date().toString(), res.statusCode, body)
  })
})
.catch((err) => console.error(new Date().toString(), err))
```
