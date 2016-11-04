const _mergeWith = require('lodash.mergewith');
const _isArray = require('lodash.isarray');
const _isObject = require('lodash.isobject');
const _unionWith = require('lodash.unionwith');
const _unset = require('lodash.unset');
const _mapValues = require('lodash.mapvalues');
const _remove = require('lodash.remove');

const taobao = require('./taobao');
const maoyan = require('./maoyan');
const gewara = require('./gewara');
const cliLog = require('../util/cliLog');

module.exports = (()=>({
  /**
   * @return {Promise.<Object>}
   */
  async citiesObj (){
    try {
      const cityLists = await Promise.all([taobao.getCityList(), maoyan.getCityList()]).then(cityLists=>cityLists);
      const _arrUnion = (taobao, maoyan)=>_unionWith(taobao, maoyan, (src, target)=> {
        if (target.id) {
          _unset(target, 'id');
          _unset(target, 'parentId');
          _unset(target, 'pinYin');
        }
        if (src.regionName === target.regionName) {
          return target.cityCode = {taobao: target.cityCode, maoyan: src.cityCode, gewara: target.cityCode};
        }
      });
      let _objMerge = _mergeWith(cityLists[0], cityLists[1],
        (target, src)=> {
          if (_isArray(target) && _isArray(src)) {
            return _arrUnion(target, src);
          }
        }
      );
      _objMerge = _mapValues(_objMerge, arr=> _remove(arr, city=> _isObject(city.cityCode)));
      return _objMerge;
    } catch (e) {
      cliLog.error(e);
    }
  }
}))();