#!/usr/bin/env node

const debug = require('debug')('glitch-deploy')

if (process.env.CI) {
  debug('Running on CI, checking for environment varibales')
  require('../lib/env.js')
}

const puppeteer = require('puppeteer')

const authorizeGithubAccess = require('../lib/authorize-github-access')
const authorizeGithubRepoAccess = require('../lib/authorize-github-repo-access')
const createGlitchProject = require('../lib/create-glitch-project')
const getGithubCredentials = require('../lib/get-github-credentials')
const getGlitchApp = require('../lib/get-glitch-app')
const getGlitchNameAndRepo = require('../lib/get-glitch-name-and-repo')
const getPackageDefaults = require('../lib/get-package-defaults')
const handleGithub2faAuthentication = require('../lib/handle-github-2fa-authentication')
const importGitHubRepo = require('../lib/import-github-repo')

;(async () => {
  const state = {
    debug: debug,
    defaults: getPackageDefaults(),
    browser: await puppeteer.launch({
      // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions
      headless: !process.env.SHOW_BROWSER
    })
  }

  process.on('unhandledRejection', async (error) => {
    console.log(error)
    await state.browser.close()
    process.exit(1)
  })

  state.page = await state.browser.newPage()
  await state.page.goto('https://glitch.com', {waitUntil: 'networkidle'})
  debug('glitch.com loaded')

  // click on login with GitHub
  // page.click does not work with given selector
  // await state.page.click('[href^="https://github.com/login/oauth/authorize"]')
  await state.page.evaluate(() => {
    document.querySelector('[href^="https://github.com/login/oauth/authorize"]').click()
  })

  debug('Login with GitHub')
  await state.page.waitForNavigation()

  const githubCredentials = await getGithubCredentials(state)
  state.githubUsername = githubCredentials.username

  await state.page.focus('[name=login]')
  await state.page.type(githubCredentials.username)
  await state.page.focus('[name=password]')
  await state.page.type(githubCredentials.password)
  await state.page.click('[type=submit]')
  await state.page.waitForNavigation()

  await handleGithub2faAuthentication(state)
  await authorizeGithubAccess(state)

  const glitchInfo = await getGlitchNameAndRepo(state)
  state.glitchDomain = glitchInfo.appName
  state.repoName = glitchInfo.repoName

  let glitchApp = await getGlitchApp(state, glitchInfo.appName)

  // abort if app does not exist and user does not want to create it
  if (glitchApp === null && !glitchInfo.doCreate) {
    debug('aborting')
    return state.browser.close()
  }

  const glitchAuthToken = await state.page.evaluate(() => JSON.parse(window.localStorage.getItem('cachedUser')).persistentToken)
  debug(`glitchAuthToken: ${glitchAuthToken.substr(0, 5)}***`)

  if (glitchApp === null && glitchInfo.doCreate) {
    debug(`creating ${glitchInfo.appName}`)
    glitchApp = await createGlitchProject(state, {
      authToken: glitchAuthToken,
      domain: glitchInfo.appName
    })
    debug(`${glitchApp.domain} created (id: ${glitchApp.id})`)
  }

  debug(`Opening https://glitch.com/edit/#!/${glitchInfo.appName}`)
  await state.page.goto(`https://glitch.com/edit/#!/${glitchInfo.appName}`, {waitUntil: 'networkidle'})
  await state.page.waitFor(() => /\?path=/.test(window.location.hash))
  debug(`${glitchInfo.appName} opened`)

  await authorizeGithubRepoAccess(state)

  await importGitHubRepo(state, {
    authToken: glitchAuthToken,
    appId: glitchApp.id,
    repoName: glitchInfo.repoName
  })

  debug('Waiting for server to start ...')
  await state.page.waitForSelector('.status.success')

  debug(`Opening https://${glitchApp.domain}.glitch.me ...`)
  await state.page.goto(`https://${glitchApp.domain}.glitch.me`, {waitUntil: 'networkidle'})

  console.log(`${glitchInfo.repoName} deployed to https://${glitchApp.domain}.glitch.me`)
  state.browser.close()
})()
