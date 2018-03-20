module.exports = authorizeGithubRepoAccess

async function authorizeGithubRepoAccess (state) {
  const hasReadAccess = await state.page.evaluate((repoName) => {
    return window.application.checkGitHubReadPermissions(repoName)
  }, state.repoName)

  if (!hasReadAccess) {
    state.debug(`Repo access not yet granted to Glitch. Granting now `)
    await state.page.evaluate(() => window.application.ensureGitHubReadPermissions())
    await state.page.waitForNavigation()
    await state.page.waitForSelector('button[type=submit]:not([disabled])')
    await state.page.click('button[type=submit]')
    await state.page.waitForNavigation()
    state.debug('github.com: repo access granted to glitch.com')
  }
}
