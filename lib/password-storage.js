const debug = require('debug')('glitch-deploy')

module.exports = function (service) {
  try {
    var keytar = require('keytar')
  } catch (e) {
    return {
      get: () => Promise.resolve({}),
      set: () => {
        debug('"keytar" is not installed correctly, not saving password')
        return Promise.resolve()
      }
    }
  }

  const key = `semantic-release-cli:${service}`
  return {
    get: username => keytar.getPassword(key, username),
    set: (username, password) => keytar.replacePassword(key, username, password)
  }
}
