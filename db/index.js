const MongoClient = require('mongodb').MongoClient;
const format = require('util').format;

const cliLog = require('../util/cliLog');

module.exports = (()=>({
  /**
   * 插入城市列表数据
   * @param db {Db}
   * @param cities {Array}
   * @param callback {Function}
   * @return {Promise.<Object>}
   */
  insertCities(db, cities, callback){
    return db
      .collection('cities')
      .insertMany(cities)
      .then(res=> {
        if (res.result.ok !== 1) return cliLog.error('插入数据失败');
        cliLog.success(`成功插入${res.ops.length}条城市数据`);
        callback(res);
        return res.ops.length;
      });
  },
  /**
   *
   * @param db {Db}
   * @param callback {Function}
   * @param query {Object} 查询条件
   * @return {Promise.<Array>}
   */
  findCities(db, callback, query = {}){
    return db
      .collection('cities')
      .find(query)
      .toArray()
      .then(docs=> {
        cliLog.success(`成功获取${docs.length}条城市数据`);
        callback(docs);
        return docs;
      });
  },
  /**
   *
   * @param db {Db}
   * @param callback {Function}
   * @param id {Number}
   * @return {*|Promise.<Array>}
   */
  findCityById(db, callback, id){
    return this.findCities(db, callback, {id});
  }
}))();


