const restify = require('restify');
const MongoClient = require('mongodb').MongoClient;

const _mergeWith = require('lodash.mergewith');
const _merge = require('lodash.merge');
const _isArray = require('lodash.isarray');
const _isObject = require('lodash.isobject');
const _unionWith = require('lodash.unionwith');
const _unset = require('lodash.unset');
const _mapValues = require('lodash.mapvalues');
const _remove = require('lodash.remove');
const _mapKeys = require('lodash.mapkeys');

const taobao = require('./cawler/taobao');
const maoyan = require('./cawler/maoyan');
const gewara = require('./cawler/gewara');
const cawler = require('./cawler/index');
const cliLog = require('./util/cli-log');
const docOperate = require('./db/index');

const server = restify.createServer();
const url = 'mongodb://api:api@127.0.0.1:3000/movie?authMechanism=SCRAM-SHA-1';

server.get('/taobao/cities', async(req, res)=>res.json(await taobao.getCityList()));
server.get('/taobao/movies', async(req, res)=> {
  try {
    res.json(await taobao.getHotMovieList());
  } catch (e) {
    cliLog.error(e);
  }
});

server.get('/maoyan/cities', async(req, res)=> {
  try {
    res.json(await maoyan.getCityList());
  } catch (e) {
    console.log(e);
  }
});


server.get('/maoyan/movies', async(req, res)=> {
  try {
    res.json(await maoyan.getHotMovieList());
  } catch (e) {
    console.log(e);
  }
});

server.get('/gewara/movies', async(req, res)=> {
  res.json(await gewara.getHotMovieList());
});

server.get('/cities', async(req, res)=> {
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
    res.json(_objMerge);
  } catch (e) {
    console.log(e);
  }
});

server.get('/movies', async(req, res)=> {
  try {
    const movieLists = await Promise.all([taobao.getHotMovieList(), maoyan.getHotMovieList(), gewara.getHotMovieList()])
      .then(movieLists=>movieLists);
    let _movieList = _unionWith(movieLists[0], movieLists[1], movieLists[2], (src, target)=> {
      if (src.name == target.name) return target.link = _merge(src.link, target.link);
    });
    _movieList = _remove(_movieList, movie=>movie.link.taobao);
    res.json(_movieList);
    console.log(_movieList.length);
  } catch (e) {
    console.log(e);
  }
});


(async()=> {
  const citiesObj = await cawler.citiesObj();
  const citiesArr = [];
  _mapKeys(citiesObj, (cities, key)=> {
    for (const city of cities) {
      city.initials = key;
      citiesArr.push(city);
    }
  });
  MongoClient.connect(url, (err, db)=> {
    if (err) return cliLog.error(err);
    docOperate.insertCities(db, ()=>db.close(), citiesArr);
  });
})();


// server.listen(8080, ()=> {
//   console.log('%s listening at %s', server.name, server.url);
// });