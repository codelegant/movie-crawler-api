/**
 * Author: 赖传峰
 * Email: laichuanfeng@hotmail.com
 * homepage: laichuanfeng.com
 */
const mongoose = require('mongoose');
const cliLog = require('../libs/cliLog');
const Schema = mongoose.Schema;
const db = mongoose.connection;

// mongoose.connect('mongodb://api:api@127.0.0.1:1000/movie?authMechanism=SCRAM-SHA-1');
db.open('mongodb://api:api@127.0.0.1:1000/movie?authMechanism=SCRAM-SHA-1');
db.on('error', err => cliLog.error(`Connection Error: ${err}`));

const citySchema = new Schema({
  regionName: String,
  cityCode: {
    taobaoCityCode: Number,
    maoyanCityCode: Number,
    gewaraCityCode: Number,
  },
  initials: String,
});

citySchema.methods.findByRegionName = function () {
  return this.model('City').find({ regionName: new RegExp(this.regionName, 'i') })
};

const City = mongoose.model('City', citySchema);

module.exports = City;
