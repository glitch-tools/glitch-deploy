module.exports = getGithubCredentials

async function getGithubCredentials (state) {
  if (process.env.CI) {
    return {
      username: process.env.GITHUB_USERNAME,
      password: process.env.GITHUB_PASSWORD
    }
  }

  const inquirer = require('inquirer')
  const passwordStorage = require('./password-storage')('github')
  const githubLoginAnswers = await inquirer.prompt([{
    type: 'input',
    name: 'username',
    default: state.defaults.username,
    message: 'What is your GitHub username?',
    validate: (username) => String(username).length > 0
  }, {
    type: 'password',
    name: 'password',
    message: 'What is your GitHub password?',
    validate: (password) => String(password).length > 0,
    when: answers => passwordStorage.get(answers.username).then(result => result === null)
  }])

  const passwordFromKeychain = await passwordStorage.get(githubLoginAnswers.username)

  if (passwordFromKeychain) {
    state.debug('Loaded password from keychain')
    githubLoginAnswers.password = passwordFromKeychain
  }

  return githubLoginAnswers
}
