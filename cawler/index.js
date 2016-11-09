const _mergeWith = require('lodash.mergewith');
const _isArray = require('lodash.isarray');
const _isObject = require('lodash.isobject');
const _unionWith = require('lodash.unionwith');
const _unset = require('lodash.unset');
const _mapValues = require('lodash.mapvalues');
const _remove = require('lodash.remove');
const _mapKeys = require('lodash.mapkeys');

const taobao = require('./taobao');
const maoyan = require('./maoyan');
const gewara = require('./gewara');
const cliLog = require('../util/cliLog');

module.exports = (()=>({
  /**
   * 返回数据格式或者对象格式的城市列表数据
   * @param type {String<'arr'|'obj'>}
   * @return {Object|Array}
   */
  async cities (type = 'arr'){
    const cityLists = await Promise.all([taobao.getCityList(), maoyan.getCityList()]).then(cityLists=>cityLists);
    const _arrUnion = (taobao, maoyan)=>_unionWith(taobao, maoyan, (src, target)=> {
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
    });
    let citiesObj = _mergeWith(cityLists[0], cityLists[1],
      (target, src)=> {
        if (_isArray(target) && _isArray(src)) {
          return _arrUnion(target, src);
        }
      }
    );
    citiesObj = _mapValues(citiesObj, arr=> _remove(arr, city=> _isObject(city.cityCode)));
    if (type === 'obj') return citiesObj;
    const citiesArr = [];
    _mapKeys(citiesObj, (cities, key)=> {
      for (const city of cities) {
        city.initials = key;
        citiesArr.push(city);
      }
    });
    return citiesArr;
  }
}))();