const ObjectID = require('mongodb').ObjectID;
const MongoClient = require('mongodb').MongoClient;

const cliLog = require('../util/cliLog');

class MovieDb {
  constructor(url = 'mongodb://api:api@127.0.0.1:3000/movie?authMechanism=SCRAM-SHA-1') {
    this.url = url;
    this.connect = MongoClient.connect(this.url);
  }

  get client() {
    return this.connect;
  }

  /**
   * 插入城市列表数据
   * @param collection {String}
   * @param docs {Array}
   * @param close {Boolean}
   * @param callback {Function}
   * @return {Promise.<Object>}
   */
  insert(collection, docs, close = true, callback = ()=> {
  }) {
    return this
      .connect
      .then(
        db=> db
          .collection(collection)
          .insertMany(docs)
          .then(res=> {
            if (res.result.ok !== 1)  throw MongoError('未正确执行插入命令');
            cliLog.success(`${collection}: 插入 ${res.ops.length} 条数据`);
            callback(res);
            close && db.close();
            return res;
          })
      );
  }

  /**
   * 查询多条数据
   * @param callback {Function}
   * @param close {Boolean}
   * @param query {Object}
   * @param collection {String}
   * @return {Promise.<Array>}
   */
  findMany(collection, close = true, query = {}, callback = ()=> {
  }) {
    return this
      .connect
      .then(
        db=>db
          .collection(collection)
          .find(query)
          .toArray()
          .then(docs=> {
            cliLog.success(`${collection}: 获取 ${docs.length} 条数据`);
            callback(docs);
            close && db.close();
            return docs;
          })
      );
  }

  /**
   * 使用 id 查询数据
   * @param collection {String}
   * @param id {String}
   * @param close {Boolean}
   * @param callback {Function}
   * @return {*|Promise.<Array>}
   */
  findById(collection, id, close = true, callback = ()=> {
  }) {
    const _id = new ObjectID(id);
    return this
      .connect
      .then(
        db=>db
          .connect
          .collection(collection)
          .findOne({_id})
          .then(docs=> {
            cliLog.success(`${collection}: 获取 _id:${id} 的数据`);
            callback(docs);
            close && db.close();
            return docs;
          })
      );
  }

  /**
   * 删除多条数据
   * @param collection {String}
   * @param close {Boolean}
   * @param query {Object}
   * @param callback {Function}
   * @return {Promise.<Object>}
   */
  deleteMany(collection, close = true, query, callback = ()=> {
  }) {
    return this
      .connect
      .then(
        db=>db
          .collection(collection)
          .deleteMany(query)
          .then(res=> {
            if (res.result.ok !== 1) throw MongoError('未正确执行删除命令');
            cliLog.success(`${collection}: 删除 ${res.deletedCount} 条数据`);
            callback(res);
            close && db.close();
            return res;
          })
      );
  }

  /**
   * 索引是否存在
   * @param collection {String}
   * @param indexes {Array}
   * @param close {Boolean}
   * @param callback {Function}
   * @return {Promise.<Boolean>}
   */
  indexExists(collection, indexes, close = true, callback = ()=> {
  }) {
    return this
      .connect
      .then(
        db=>db
          .collection(collection)
          .indexExists(indexes)
          .then(res=> {
            callback(res);
            close && db.close();
            return res;
          })
      );
  }

  /**
   * 集合是否存在
   * @param collection {String}
   * @param close {Boolean}
   * @return {Promise.<Boolean>}
   */
  async collectionExists(collection, close = true) {
    return this
      .connect
      .then(
        db=>db
          .listCollections()
          .toArray()
          .then(collections=> {
            let exists = false;
            for (const ele of collections) {
              if (ele.name === collection) {
                exists = true;
                break;
              }
            }
            close && db.close();
            return collections
          })
      );
  }
}

module.exports = MovieDb;
