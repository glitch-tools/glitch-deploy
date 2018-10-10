module.exports = importGitHubRepo

const axios = require('axios')

async function importGitHubRepo (state, {authToken, appId, repoName}) {
  state.debug(`Importing ${repoName} ...`)

  const response = await axios({
    method: 'post',
    url: `https://api.glitch.com/project/githubImport?authorization=${authToken}&projectId=${appId}&repo=${encodeURIComponent(repoName)}`
  })

  state.debug(`${repoName} imported`)

  return response.status === 200
}
