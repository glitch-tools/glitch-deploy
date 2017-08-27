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

## Deploy from CI

`glitch-deploy` can be run as part of your continious integration, for example
using [Travis CI](https://travis-ci.org/).

You have to set the following environment variables

- `GITHUB_USERNAME`
- `GITHUB_PASSWORD`
- `GITHUB_REPO` _(e.g. `octocat/Hello-World`)_
- `GLITCH_DOMAIN` _(the name of your Glitch app)_

It’s recommended to create a separate GitHub user account for the deployment to
keep your own account’s credentials safe. If the given Glitch app already exists
then make sure the account is invited as collaborator. If the repository is
private you have to invite the account as collaborator on GitHub, too.

Happy auto-deploying to Glitch :)

## How it works

`glitch-deploy` is using [puppeteer](https://github.com/GoogleChrome/puppeteer)
to run a headless Chrome browser to sign in to GitHub & Glitch, create a new
Glitch app and import the repository form GitHub.

Note that `glitch-deploy` is using undocumented Glitch APIs that might change at
any time.

## License

[Apache 2.0](LICENSE)
