
# Install

```bash
npm install -g slack-webhook-twitter
```

# CLI

```bash
slack-webhook-twitter \
  --env development|staging|production \
  --config path/to/config.json \
  --db path/to/db.json
```

# config.json

```js
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
    "slack": {
      "hook": "[Hook URL]", // or ["[Hook URL 1]", "[Hook URL N]"]
      "username": "[Bot Name]",
      "icon_url": "[Bot Avatar]",
      "channel": "[Target Channel or User]"
    }
  }
}
```

# db.json

```js
{
  "development": {
    "id": ""
  }
}
```

# Crontab

```bash
# Check on every 15 min:
*/15 * * * * node slack-webhook-twitter [params] >> twitter.log
```

# API

```js
var hook = require('slack-webhook-twitter')
hook.init({
  env: 'development',
  config: require('config.json'),
  db: require('db.json')
})
// Check on every 15 min:
setTimeout(() => hook.check, 1000 * 60 * 15)
```
