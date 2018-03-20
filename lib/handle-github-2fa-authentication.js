module.exports = handleGithub2faAuthentication

async function handleGithub2faAuthentication (state) {
  const twoFactorTokenInput = await state.page.$('[name=otp]')

  if (!twoFactorTokenInput) {
    return
  }

  if (process.env.CI) {
    throw new Error(`GitHub user ${state.githubUsername} requires Two Factor Authentication which is not possible when run on CI`)
  }

  const inquirer = require('inquirer')
  state.debug('github.com: Two Factor Authentication prompt')
  const tokenAnswer = await inquirer.prompt([{
    type: 'input',
    name: 'code',
    message: 'What is your GitHub two-factor authentication code?'
  }])

  await state.page.type('[name=otp]', tokenAnswer.code)

  await state.page.click('[type=submit]')
  await state.page.waitForNavigation()
  state.debug('2Fa code submitted')
}
