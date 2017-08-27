module.exports = getGlitchNameAndRepo

const githubNameRegex = require('github-username-regex')

const glitchAppDoesNotExists = require('./glitch-app-does-not-exist')

async function getGlitchNameAndRepo (state) {
  if (process.env.CI) {
    return {
      appName: process.env.GLITCH_DOMAIN,
      repoName: process.env.GITHUB_REPO,
      doCreate: true
    }
  }

  const inquirer = require('inquirer')
  return inquirer.prompt([{
    type: 'input',
    name: 'appName',
    default: state.defaults.name,
    message: 'To what Glitch app do you want to deploy (https://<app name>.glitch.com)?',
    validate: (appName) => String(appName).length > 0
  }, {
    type: 'confirm',
    name: 'doCreate',
    message: 'App does not yet exist, do you want to create it',
    when: answers => glitchAppDoesNotExists(state, answers.appName)
  }, {
    type: 'input',
    name: 'repoName',
    default: state.defaults.repo,
    message: 'What repository do you want to deploy (https://github.com/<repository>, e.g. "octocat/Hello-World")',
    validate: (name) => {
      const [owner, repoName] = name.split('/')
      return githubNameRegex.test(owner) && githubNameRegex.test(repoName) && name === `${owner}/${repoName}`
    },
    when: answers => !answers.hasOwnProperty('doCreate') || answers.doCreate
  }])
}
