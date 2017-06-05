/**
 * Author: 赖传峰
 * Email: laichuanfeng@hotmail.com
 * homepage: laichuanfeng.com
 */

const mongoose = require('mongoose')
const cliLog = require('../libs/cliLog')
mongoose.Promise = global.Promise
// db.open('mongodb://api:api@127.0.0.1:1000/movie?authMechanism=SCRAM-SHA-1');

module.exports = function connect () {
  global.g_connect = mongoose.connection
  global.g_connect.on('error', err => cliLog.error(`Connection Error: ${err}`))

  const readyState = global.g_connect.readyState
  if (readyState === 1 || readyState === 2) return global.g_connect

  return global.g_connect.open('127.0.0.1', 'movie', '1000', {
    user: 'api',
    pass: 'api',
    auth: {
      authMechanism: 'SCRAM-SHA-1'
    }
  })
}
