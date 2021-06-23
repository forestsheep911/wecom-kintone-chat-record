const path = require('path')
const webpack = require('../config/webpack.common')

const outputDir = webpack.output.path
const outputJS = () => {
  const { entry } = webpack
  if (typeof entry === 'object' && !Array.isArray(entry)) {
    return Object.keys(entry)
  }
  return ['main']
}

module.exports = Object.freeze({
  outputDir,
  envfile: path.resolve(__dirname, '../.env'),
  envBaseURL: 'BASE_URL',
  envUserName: 'USER_NAME',
  envPassword: 'PASSWORD',
  envAppID: 'APPID',
  outputJS: outputJS(),
  domain: 'localhost',
  port: 8080,
  customize: ['desktop', 'mobile'].map((el) => el.toUpperCase()),
})
