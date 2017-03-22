const restify = require('restify');
const debug = require('debug')('debug');

const cawler = require('../crawler/index');
const cliLog = require('../libs/cliLog');
const City = require('../db/City');

/**
 * 直接从数据库获取城市列表
 */
const getFromDb = async(req, res, next) => {
  try {
    const { regionName } = req.query;
    if (regionName) return next('regionName');

    const docs = await City.find();
    return docs.length ? res.json(200, docs) : next();

  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('获取城市列表失败'));
  }
};

/**
 * 先爬取城市列表，然后存入数据库
 */
const getFromCawler = async(req, res, next) => {
  try {
    const docs = await City.create(await cawler.cities());

    return docs.length
      ? res.json(200, docs)
      : next(new restify.NotFoundError('未查询到城市列表'));
  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('获取城市列表失败'));
  }
};

/**
 * @desc 使用 regionName 字段查询城市数据
 */
const getByRegionNameFromDb = async(req, res, next) => {
  try {
    const { regionName } = req.query;
    if (!regionName) {
      return next(new restify.InvalidArgumentError('只接受 regionName 作为参数'));
    }

    const city = new City({ regionName });
    const docs = await city.findByRegionName();

    return docs.length ? res.json(200, docs) : next();
  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('获取城市信息失败'));
  }
};

/**
 * 数据为空，重新抓取，存储，查找 regionName
 */
const getByRegionNameFromCawler = async(req, res, next) => {
  try {
    const { regionName } = req.query;
    if (!regionName) {
      return next(new restify.InvalidArgumentError('只接受 regionName 作为参数'));
    }

    const cities = await cawler.cities();
    if (!(await City.create(cities)).length) {
      return next(new restify.InternalServerError('获取城市信息失败'));
    }

    const city = new City({ regionName });
    const docs = await city.findByRegionName();

    return docs.length
      ? res.json(200, docs)
      : next(new restify.NotFoundError(`查询 regionName:${regionName} 失败`));

  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('获取城市信息失败'));
  }
};

/**
 * 更新数据库
 * 重新爬取城市列表信息，并存入数据库
 */
const put = async(req, res, next) => {
  try {
    const deleteResult = await City.deleteMany();
    if (deleteResult.result.ok != 1) {
      return next(new restify.InternalServerError('更新城市列表失败'));
    }

    const cities = await cawler.cities();
    const docs = await City.create(cities);

    return res.send(docs.length ? 201 : 204);
  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('更新城市列表失败'));
  }
};

module.exports = {
  getFromDb,
  getFromCawler,
  getByRegionNameFromDb,
  getByRegionNameFromCawler,
  put,
};