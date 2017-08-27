module.exports = authorizeGithubAccess

async function authorizeGithubAccess (state) {
  const oauthAuthorizeButton = await state.page.$('form[action="/login/oauth/authorize"]')

  if (oauthAuthorizeButton) {
    state.debug('github.com: Oauth request page for glitch.com')
    await state.page.waitForSelector('button[type=submit]:not([disabled])')
    await state.page.click('button[type=submit]')
    await state.page.waitForNavigation()
    state.debug('github.com: access granted to glitch.com')
  }
}
