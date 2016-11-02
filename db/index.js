const MongoClient = require('mongodb').MongoClient;
const format = require('util').format;

const cliLog = require('../util/cli-log');

module.exports = (()=>({
  insertCities(db, callback, cities){
    const collection = db.collection('cities');
    collection.insertMany(cities, (err, res)=> {
      if (err) return cliLog.error(err);
      if (res.result.ok !== 1) return cliLog.error('插入数据失败');
      cliLog.success(format('成功插入%s条城市列表数据', res.ops.length));
      callback(res);
    })
  }
}))();


