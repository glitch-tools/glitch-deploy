# glitch-deploy

> CLI tool to deploy a GitHub repository to glitch.com

![Glitch Deploy Screencast](/assets/glitch-deploy-screencast.gif?raw=true)

## Usage

```
# requires node 8
npx glitch-deploy
```

Enable debug logs

```
DEBUG=glitch-deploy* glitch-deploy
```

Show browser UI

```
SHOW_BROWSER=1 glitch-deploy
```

## How it works

`glitch-deploy` is using [puppeteer](https://github.com/GoogleChrome/puppeteer)
to run a headless Chrome browser to sign in to GitHub & Glitch, create a new
Glitch app and import the repository form GitHub.

Note that `glitch-deploy` is using undocumented Glitch APIs that might change at
any time.

## License

[Apache 2.0](LICENSE)
