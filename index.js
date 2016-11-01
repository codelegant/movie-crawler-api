const restify = require('restify');
const taobao = require('./cawler/taobao');
const maoyan = require('./cawler/maoyan');
const gewara = require('./cawler/gewara');
const chalk = require('chalk');
const log = console.log;
const error = msg=>console.log(chalk.red(msg));
const warn = msg=>console.log(chalk.yellow(msg));
const info = msg=>console.log(chalk.blue(msg));
const _mergeWith = require('lodash.mergewith');
const _merge = require('lodash.merge');
const _isArray = require('lodash.isarray');
const _isObject = require('lodash.isobject');
const _unionWith = require('lodash.unionwith');
const _unset = require('lodash.unset');
const _mapValues = require('lodash.mapvalues');
const _remove = require('lodash.remove');

const server = restify.createServer();
server.get('/taobao/cities', async(req, res)=>res.json(await taobao.getCityList()));
error('err');
server.get('/taobao/movies', async(req, res)=> {
  try {
    res.json(await taobao.getHotMovieList());
  } catch (e) {
    error(e);
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

server.listen(8080, ()=> {
  console.log('%s listening at %s', server.name, server.url);
});