#!/usr/bin/env node

const pathResolve = require('path').resolve

const axios = require('axios')
const debug = require('debug')('glitch-deploy')
const getProperty = require('lodash/get')
const githubFromGit = require('github-url-from-git')
const githubNameRegex = require('github-username-regex')
const inquirer = require('inquirer')
const puppeteer = require('puppeteer')

const passwordStorage = require('../lib/password-storage')('github')

;(async () => {
  const pkgDefaults = getPackageDefaults()

  const browser = await puppeteer.launch({
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions
    headless: !process.env.SHOW_BROWSER
  })

  process.on('unhandledRejection', async (error) => {
    console.log(error)
    await browser.close()
    process.exit(1)
  })

  const page = await browser.newPage()

  // await page.goto('https://glitch.com')
  await page.goto('https://glitch.com', {waitUntil: 'networkidle'})

  debug('glitch.com loaded')

  // click on login with GitHub
  // page.click does not work with given selector
  // await page.click('[href^="https://github.com/login/oauth/authorize"]')
  await page.evaluate(() => {
    document.querySelector('[href^="https://github.com/login/oauth/authorize"]').click()
  })

  debug('GitHub login clicked')

  await page.waitForNavigation()

  const githubLoginAnswers = await inquirer.prompt([{
    type: 'input',
    name: 'username',
    default: pkgDefaults.username,
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
    debug('Loaded password from keychain')
    githubLoginAnswers.password = passwordFromKeychain
  }

  await page.focus('[name=login]')
  await page.type(githubLoginAnswers.username)

  await page.focus('[name=password]')
  await page.type(githubLoginAnswers.password)

  await page.click('[type=submit]')
  await page.waitForNavigation()

  const twoFactorTokenInput = await page.$('[name=otp]')

  if (twoFactorTokenInput) {
    debug('github.com: Two Factor Authentication prompt')
    const tokenAnswer = await inquirer.prompt([{
      type: 'input',
      name: 'code',
      message: 'What is your GitHub two-factor authentication code?'
    }])

    await page.focus('[name=otp]')
    await page.type(tokenAnswer.code)

    await page.click('[type=submit]')
    await page.waitForNavigation()
    debug('2Fa code submitted')
  }

  const oauthAuthorizeButton = await page.$('form[action="/login/oauth/authorize"]')

  if (oauthAuthorizeButton) {
    debug('github.com: Oauth request page for glitch.com')
    await page.waitForSelector('button[type=submit]:not([disabled])')
    await page.click('button[type=submit]')
    await page.waitForNavigation()
    debug('github.com: access granted to glitch.com')
  }

  const glitchAnswers = await inquirer.prompt([{
    type: 'input',
    name: 'appName',
    default: pkgDefaults.name,
    message: 'To what Glitch app do you want to deploy (https://<app name>.glitch.com)?',
    validate: (appName) => String(appName).length > 0
  }, {
    type: 'confirm',
    name: 'doCreate',
    message: 'App does not yet exist, do you want to create it',
    when: answers => glitchAppDoesNotExists(answers.appName)
  }, {
    type: 'input',
    name: 'repoName',
    default: pkgDefaults.repo,
    message: 'What repository do you want to deploy (https://github.com/<repository>, e.g. "octocat/Hello-World")',
    validate: (name) => {
      const [owner, repoName] = name.split('/')
      return githubNameRegex.test(owner) && githubNameRegex.test(repoName) && name === `${owner}/${repoName}`
    },
    when: answers => !answers.hasOwnProperty('doCreate') || answers.doCreate
  }])

  let glitchApp = await getGlitchApp(glitchAnswers.appName)

  // abort if app does not exist and user does not want to create it
  if (glitchApp === null && !glitchAnswers.doCreate) {
    debug('aborting')
    return browser.close()
  }

  const glitchAuthToken = await page.evaluate(() => JSON.parse(window.localStorage.getItem('cachedUser')).persistentToken)
  debug(`glitchAuthToken: ${glitchAuthToken}`)

  if (glitchAnswers.doCreate) {
    debug(`creating ${glitchAnswers.appName}`)
    glitchApp = await createGlitchProject({
      authToken: glitchAuthToken,
      domain: glitchAnswers.appName
    })
    debug(`${glitchApp.domain} created (id: ${glitchApp.id})`)
  }

  debug(`Opening https://glitch.com/edit/#!/${glitchAnswers.appName}`)
  await page.goto(`https://glitch.com/edit/#!/${glitchAnswers.appName}`, {waitUntil: 'networkidle'})
  await page.waitFor(() => /\?path=/.test(window.location.hash))
  debug(`${glitchAnswers.appName} opened`)

  // check if repo access granted yet
  const hasReadAccess = await page.evaluate((repoName) => {
    console.log('repoName', repoName)
    return window.application.checkGitHubReadPermissions(repoName)
  }, glitchAnswers.repoName)

  if (!hasReadAccess) {
    debug(`Repo access not yet granted to Glitch. Granting now `)
    await page.evaluate(() => window.application.ensureGitHubReadPermissions())
    await page.waitForNavigation()
    await page.waitForSelector('button[type=submit]:not([disabled])')
    await page.click('button[type=submit]')
    await page.waitForNavigation()
    debug('github.com: repo access granted to glitch.com')
  }

  await importGitHubRepo({
    authToken: glitchAuthToken,
    appId: glitchApp.id,
    repoName: glitchAnswers.repoName
  })

  debug('Waiting for server to start ...')
  await page.waitForSelector('.status.success')

  debug(`Opening https://${glitchApp.domain}.glitch.me ...`)
  await page.goto(`https://${glitchApp.domain}.glitch.me`, {waitUntil: 'networkidle'})

  console.log(`${glitchAnswers.repoName} deployed to https://${glitchApp.domain}.glitch.me`)
  browser.close()
})()

async function getGlitchApp (appName) {
  const url = `https://api.glitch.com/projects/${appName}`
  debug(`GET ${url}`)
  const response = await axios.get(url)
  return response.data
}
async function glitchAppDoesNotExists (appName) {
  const app = await getGlitchApp(appName)
  return app === null
}

function getPackageDefaults () {
  try {
    const pkg = require(pathResolve(process.cwd(), 'package.json'))
    const url = githubFromGit(getProperty(pkg, 'repository.url'))
    const [owner, repoName] = url.substr('https://github.com/'.length).split('/')
    return {
      name: pkg.name,
      username: owner,
      repo: `${owner}/${repoName}`
    }
  } catch (error) {
    return {}
  }
}

async function createGlitchProject ({authToken, domain}) {
  const data = {
    domain
  }

  debug(`creating Glitch app with ${JSON.stringify(data)}`)

  const response = await axios({
    method: 'post',
    url: `https://api.glitch.com/projects?authorization=${authToken}`,
    data: data
  })

  return response.data
}

async function importGitHubRepo ({authToken, appId, repoName}) {
  debug(`Importing ${repoName} ...`)

  const response = await axios({
    method: 'post',
    url: `https://api.glitch.com/project/githubImport?token=${authToken}&projectId=${appId}&repo=${encodeURIComponent(repoName)}`
  })

  debug(`${repoName} imported`)

  return response.status === 200
}
