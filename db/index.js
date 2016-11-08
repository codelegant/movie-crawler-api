const ObjectID = require('mongodb').ObjectID;
const cliLog = require('../util/cliLog');

module.exports = (()=>({
  /**
   * 插入城市列表数据
   * @param db {Db}
   * @param docs {Array}
   * @param collection {String}
   * @param callback {Function}
   * @return {Promise.<Object>}
   */
  insert(db, docs, collection, callback = ()=> {
  }){
    return db
      .collection(collection)
      .insertMany(docs)
      .then(res=> {
        if (res.result.ok !== 1) return cliLog.error('插入数据失败');
        cliLog.success(`成功插入${res.ops.length}条数据`);
        callback(res);
        return res.ops.length;
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
  findMany(db, collection, callback = ()=> {
  }, query = {}){
    return db
      .collection(collection)
      .find(query)
      .toArray()
      .then(docs=> {
        cliLog.success(`成功获取${docs.length}条数据`);
        callback(docs);
        return docs;
      });
  },
  /**
   * 使用 id 查询数据
   * @param db {Db}
   * @param collection {String}
   * @param callback {Function}
   * @param id {Number}
   * @return {*|Promise.<Array>}
   */
  findById(db, collection, callback = ()=> {
  }, id){
    const _id=new ObjectID(id);
    return db
      .collection(collection)
      .findOne({_id})
      .then(docs=> {
        cliLog.success(`成功获取 _id:${id} 的数据`);
        callback(docs);
        return docs;
      });
  }
}))();


