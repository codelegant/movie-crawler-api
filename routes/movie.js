const restify = require('restify');
const debug = require('debug')('debug');

const cawler = require('../cawler/index');
const cliLog = require('../libs/cliLog');
const MovieDb = require('../db/MovieDb');

module.exports = (() => ({
  async getByCityIdFromDb(req, res, next){
    try {
      const { cityId } = req.query;
      if (! cityId) {
        return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));
      }

      const movieDb = new MovieDb();

      const moviesExists = await movieDb.collectionExists('movies', false);
      if (! moviesExists) {
        await movieDb.client.then(db => db.createCollection('movies'));
        return next();
      }

      const docs = await movieDb.findMany('movies', true, { cityId });

      return docs.length ? res.json(200, docs) : next();

    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取热门电影失败'));
    }
  },
  async getByCityIdFromCawler(req, res, next) {
    try {
      const { cityId } = req.query;
      if (! cityId) {
        return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));
      }

      let movies = await cawler.movies(cityId);
      movies = movies.map(ele => {
        ele.cityId = cityId;
        ele.lastUpdated = new Date();
        return ele;
      });

      const movieDb = new MovieDb();

      //region 索引是否存在
      const lastUpdatedExists
        = await movieDb.indexExists('movies', [ 'lastUpdated_1' ], false);
      //endregion
      //region 存入数据库，插入索引
      const result = await movieDb.insert('movies', movies, lastUpdatedExists);

      ! lastUpdatedExists
      && await movieDb
        .client
        .then(
          db => db
            .collection('movies')
            .createIndex(
              { lastUpdated: 1 },
              { expireAfterSeconds: 3600 }
            )
            .then(() => db.close())
        );
      //endregion

      return result.ops.length
        ? res.json(200, result.ops)
        : next(new restify.NotFoundError('未查询到热门电影列表'));
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取热门电影失败'));
    }
  },
  async getById(req, res, next){
    try {
      const { id } = req.query;
      if (! id) return next(new restify.NotFoundError('未查询到电影信息'));

      const movieDb = new MovieDb();
      const doc = await movieDb.findById('movies', id);

      if (doc) return res.json(200, doc);
      return next(new restify.NotFoundError('未查询到电影信息'));
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取电影信息失败'));
    }
  },
  async put(req, res, next){
    try {
      const { cityId } = req.query;
      if (! cityId) {
        return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));
      }

      let movies = await cawler.movies(cityId);
      movies = movies.map(ele => {
        ele.cityId = cityId;
        ele.lastUpdated = new Date();
        return ele;
      });

      const movieDb = new MovieDb();
      await movieDb.deleteMany('movies', false, { cityId });

      //region 索引是否存在
      const lastUpdatedExists
        = await movieDb.indexExists('movies', [ 'lastUpdated_1' ], false);
      //endregion

      //region 存入数据库，插入索引
      const result = await movieDb.insert('movies', movies, lastUpdatedExists);

      ! lastUpdatedExists
      && await movieDb
        .client
        .then(
          db => db
            .collection('movies')
            .createIndex(
              { lastUpdated: 1 },
              { expireAfterSeconds: 3600 }
            )
            .then(() => db.close())
        );
      //endregion

      return res.send(result.ops.length ? 201 : 204);

    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('更新电影列表信息失败'));
    }
  },
}))();