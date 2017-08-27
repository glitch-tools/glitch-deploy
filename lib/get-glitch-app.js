module.exports = getGlitchApp

const axios = require('axios')

async function getGlitchApp (state, appName) {
  const url = `https://api.glitch.com/projects/${appName}`
  state.debug(`GET ${url}`)
  const response = await axios.get(url)
  return response.data
}
