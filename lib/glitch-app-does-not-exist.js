module.exports = glitchAppDoesNotExists

const getGlitchApp = require('./get-glitch-app')

async function glitchAppDoesNotExists (state, appName) {
  const app = await getGlitchApp(state, appName)
  return app === null
}
