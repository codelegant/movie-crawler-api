/**
 * Author: 赖传峰
 * Email: laichuanfeng@hotmail.com
 * homepage: laichuanfeng.com
 */
const mongoose = require('mongoose')
// const cliLog = require('../libs/cliLog')
const connect = require('./connect')
// const db_debug = require('debug')('db_debug')
const Schema = mongoose.Schema
connect()

const citySchema = new Schema({
  regionName: String,
  cityCode: {
    taobaoCityCode: Number,
    maoyanCityCode: Number,
    gewaraCityCode: Number
  },
  initials: String
})

citySchema.methods.findByRegionName = function () {
  return this.model('City')
             .find({regionName: new RegExp(this.regionName, 'i')})
}

const City = mongoose.model('City', citySchema)

module.exports = City
