const ObjectID = require('mongodb').ObjectID;
const MongoClient = require('mongodb').MongoClient;

const cliLog = require('../util/cliLog');
const url = 'mongodb://api:api@127.0.0.1:3000/movie?authMechanism=SCRAM-SHA-1';

module.exports = (()=>({
  client(url = url){
    return MongoClient.connect(url);
  },
  /**
   * 插入城市列表数据
   * @param db {Db}
   * @param docs {Array}
   * @param collection {String}
   * @param callback {Function}
   * @return {Promise.<Object>}
   */
  insert(db, docs, collection, callback){
    return db
      .collection(collection)
      .insertMany(docs)
      .then(res=> {
        if (res.result.ok !== 1)  throw MongoError('未正确执行插入命令');
        cliLog.success(`${collection}: 插入 ${res.ops.length} 条数据`);
        callback(res);
        return res;
      });
  },
  /**
   * 查询多条数据
   * @param db {Db}
   * @param callback {Function}
   * @param collection {String}
   * @param query {Object} 查询条件
   * @return {Promise.<Array>}
   */
  findMany(db, collection, callback, query = {}){
    return db
      .collection(collection)
      .find(query)
      .toArray()
      .then(docs=> {
        cliLog.success(`${collection}: 获取 ${docs.length} 条数据`);
        callback(docs);
        return docs;
      });
  },
  /**
   * 使用 id 查询数据
   * @param db {Db}
   * @param collection {String}
   * @param callback {Function}
   * @param id {String}
   * @return {*|Promise.<Array>}
   */
  findById(db, collection, id, callback){
    const _id = new ObjectID(id);
    return db
      .collection(collection)
      .findOne({_id})
      .then(docs=> {
        cliLog.success(`${collection}: 获取 _id:${id} 的数据`);
        callback(docs);
        return docs;
      });
  },
  /**
   *
   * @param db {Db}
   * @param collection {String}
   * @param query {Object}
   * @param callback {Function}
   * @return {Promise.<Object>}
   */
  deleteMany(db, collection, query, callback){
    if (query === {}) throw MongoError('删除操作需要传入过滤条件');
    return db
      .collection(collection)
      .deleteMany(query)
      .then(res=> {
        if (res.result.ok !== 1) throw MongoError('未正确执行删除命令');
        cliLog.success(`${collection}: 删除 ${res.deletedCount} 条数据`);
        callback(res);
        return res;
      })
  },
  /**
   *
   * @param db {Db}
   * @param collection {String}
   * @param indexes {Array}
   * @param callback {Function}
   * @return {Promise.<Boolean>}
   */
  indexExists(db, collection, indexes, callback){
    return db
      .collection(collection)
      .indexExists(indexes)
      .then(res=> {
        callback(res);
        return res;
      })
  },
  /**
   *
   * @param db {Db}
   * @param collection {String}
   * @param callback {Function}
   * @return {boolean}
   */
  async collectionExists(db, collection, callback){
    const result = await db.listCollections().toArray().then(collections=>collections);
    let exists = false;
    for (const ele of result) {
      if (ele.name === collection) {
        exists = true;
        break;
      }
    }
    callback();
    return exists;
  }
}))();


