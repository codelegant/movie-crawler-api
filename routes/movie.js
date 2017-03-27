const restify = require('restify');
const debug = require('debug')('debug');

const cawler = require('../crawler/index');
const cliLog = require('../libs/cliLog');
const Movie = require('../db/Movie');

/**
 * @desc 使用 cityId 从数据库中读取热门电影列表
 */
const getByCityIdFromDb = async (req, res, next) => {
  try {
    const {cityId} = req.query;
    if (!cityId)
      return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));

    const movies = await Movie.find();
    if (!movies.length) return next();

    const movie = new Movie({cityId});
    const docs = await movie.findByCityId();
    return docs.length ? res.json(200, docs) : next();

  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('获取热门电影失败'));
  }
};

/**
 * @desc 使用 cityId 从爬虫中读取热门电影列表
 */
const getByCityIdFromCawler = async (req, res, next) => {
  try {
    const {cityId} = req.query;
    if (!cityId)
      return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));

    const movies = await cawler.movies(cityId);

    const docs = await Movie.create(
      movies.map(
        movie => Object.assign(movie, {cityId, lastUpdated: new Date()})
      )
    );

    return docs.length
      ? res.json(200, docs)
      : next(new restify.NotFoundError('未查询到热门电影列表'));
  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('获取热门电影失败'));
  }
};

/**
 * @desc 使用 id 获取电影详情
 */
const getById = async (req, res, next) => {
  try {
    const {id} = req.params;
    if (!id) return next(new restify.NotFoundError('未查询到电影信息'));

    const doc = await Movie.findById(id);

    if (doc) return res.json(200, doc);

    return next(new restify.NotFoundError('未查询到电影信息'));
  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('获取电影信息失败'));
  }
};

/**
 * @desc 使用 cityId 重新抓取热门电影并存储
 */
const put = async (req, res, next) => {
  try {
    const {cityId} = req.query;
    if (!cityId)
      return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));

    const deleteResult = await Movie.deleteMany({cityId});
    if (deleteResult.result.ok !== 1)
      return next(new restify.InternalServerError('更新电影列表信息失败'));

    const movies = await cawler.movies(cityId);

    const docs = await Movie.create(
      movies.map(
        movie => Object.assign(movie, {cityId, lastUpdated: new Date()})
      )
    );
    return res.send(docs.length ? 201 : 204);

  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('更新电影列表信息失败'));
  }
};

module.exports = {
  getByCityIdFromDb,
  getByCityIdFromCawler,
  getById,
  put,
};