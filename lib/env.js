const envalid = require('envalid')

module.exports = envalid.cleanEnv(process.env, {
  GITHUB_USERNAME: envalid.str(),
  GITHUB_PASSWORD: envalid.str(),
  GITHUB_REPO: envalid.str(),
  GLITCH_DOMAIN: envalid.str()
})
