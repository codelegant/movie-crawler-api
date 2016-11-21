const restify = require('restify');
const debug = require('debug')('debug');

const cawler = require('../cawler/index');
const cliLog = require('../libs/cliLog');
const MovieDb = require('../db/MovieDb');

module.exports = (() => ({
  async getFromDb(req, res, next){
    try {
      const { regionName } = req.query;
      if (regionName) return next('regionName');
      const movieDb = new MovieDb();
      const docs = await movieDb.findMany('cities');

      if (docs.length) return res.json(200, docs);//有数据则是直接返回
      return next();//从各网站抓取

    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市列表失败'));
    }
  },
  async getFromCawler(req, res, next){
    try {
      const citiesArr = await cawler.cities();
      const movieDb = new MovieDb();
      const result = await movieDb.insert('cities', citiesArr);
      return result.ops.length
        ? res.json(200, result.ops)
        : next(new restify.NotFoundError('未查询到城市列表'));
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市列表失败'));
    }
  },
  async getByRegionName(req, res, next){
    try {
      const { regionName } = req.query;
      if (! regionName) {
        return next(new restify.InvalidArgumentError('只接受 regionName 作为参数'));
      }
      const movieDb = new MovieDb();
      const docs = await movieDb.findMany('cities', true, { regionName });
      return docs.length
        ? res.json(200, docs)
        : next(new restify.NotFoundError(`查询 regionName:${regionName} 失败`));
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市信息失败'));
    }
  },
  async put(req, res, next){
    try {
      const movieDb = new MovieDb();
      await movieDb.deleteMany('cities', false);

      const citiesArr = await cawler.cities();

      const cities = await cawler.cities();
      const result = await movieDb.insert('cities', citiesArr);

      return res.send(result.ops.length ? 201 : 204);
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('更新城市列表失败'));
    }
  },
}))();