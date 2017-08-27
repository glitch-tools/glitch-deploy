module.exports = createGlitchProject

const axios = require('axios')

async function createGlitchProject (state, {authToken, domain}) {
  const data = {
    domain
  }

  state.debug(`creating Glitch app with ${JSON.stringify(data)}`)

  const response = await axios({
    method: 'post',
    url: `https://api.glitch.com/projects?authorization=${authToken}`,
    data: data
  })

  return response.data
}
