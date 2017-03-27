const _mergeWith = require('lodash.mergewith');
const _isObject = require('lodash.isobject');
const _unionWith = require('lodash.unionwith');
const _unset = require('lodash.unset');
const _mapValues = require('lodash.mapvalues');
const _remove = require('lodash.remove');
const _mapKeys = require('lodash.mapkeys');
const _merge = require('lodash.merge');

const taobao = require('./taobao');
const maoyan = require('./maoyan');
const gewara = require('./gewara');
const cliLog = require('../libs/cliLog');
const City = require('../db/City');

/**
 * @desc 返回数据格式或者对象格式的城市列表数据
 * @param type {String<'arr'|'obj'>}
 * @return {Object|Array}
 */
const cities = async (type = 'arr') => {
  const cityLists = await Promise.all([
      taobao.getCities(),
      maoyan.getCities(),
    ])
    .catch(e => cliLog.error(e));

  const _arrUnion = (taobao, maoyan) =>
    _unionWith(
      taobao,
      maoyan,
      (src, target) => {
        if (target.id) {
          _unset(target, 'id');
          _unset(target, 'parentId');
          _unset(target, 'pinYin');
        }
        if (src.regionName === target.regionName) {
          return target.cityCode = {
            taobaoCityCode: target.cityCode,
            maoyanCityCode: src.cityCode,
            gewaraCityCode: target.cityCode
          };
        }
      }
    );

  let citiesObj = _mergeWith(
    cityLists[0],
    cityLists[1],
    (target, src) => {
      if (Array.isArray(target) && Array.isArray(src)) {
        return _arrUnion(target, src);
      }
    }
  );

  citiesObj = _mapValues(
    citiesObj,
    arr => _remove(arr, city => _isObject(city.cityCode))
  );

  if (type === 'obj') return citiesObj;

  const citiesArr = [];
  _mapKeys(citiesObj, (cities, key) => {
    for (const city of cities) {
      city.initials = key;
      citiesArr.push(city);
    }
  });

  return citiesArr;
};

/**
 * @desc 使用 cityId 获取热门电影列表
 * @param cityId {String}
 * @return {Array}
 */
const movies = async cityId => {
  //region 获取各个网站对就的 cityCode
  const city = await City.findById(cityId);
  //endregion

  //region 抓取热门电影
  const {taobaoCityCode, maoyanCityCode, gewaraCityCode} = city.cityCode;
  const movieLists = await Promise.all([
      taobao.getHotMovies(taobaoCityCode),
      maoyan.getHotMovies(maoyanCityCode),
      gewara.getHotMovies(gewaraCityCode),
    ])
    .catch(e => cliLog.error(e));
  let movies = _unionWith(movieLists[0], movieLists[1], movieLists[2],
    (src, target) => {
      if (src.name === target.name) {
        target.link = _merge(src.link, target.link);
        target.movieId = _merge(src.movieId, target.movieId);
      }
    });
  return _remove(movies, movie => movie.link.taobaoLink);
  //endregion
};

(async () => {
  const a = await cities();
  console.log(a);
})();

module.exports = {
  cities,
  movies,
};