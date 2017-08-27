module.exports = getPackageDefaults

const pathResolve = require('path').resolve

const getProperty = require('lodash/get')
const githubFromGit = require('github-url-from-git')

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
