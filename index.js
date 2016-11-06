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
const cliLog = require('./util/cliLog');
const docOperate = require('./db/index');

const server = restify.createServer();
const url = 'mongodb://api:api@127.0.0.1:3000/movie?authMechanism=SCRAM-SHA-1';

server.use(restify.queryParser());//使用 req.params，可以获取查询对象
server.use(restify.authorizationParser());//使用 req.authorization 获取基本认证的信息

server.get('/cities', async(req, res, next)=> {
  try {
    const docs = await MongoClient
      .connect(url)
      .then(db=>docOperate.findCities(db, ()=>db.close()));
    return docs.length ? res.json(200, docs) : next(new restify.NotFoundError('未查询到城市列表'));
  } catch (e) {
    return next(new restify.InternalServerError('获取城市列表失败'));
  }
});

server.post('/cities', async(req, res, next)=> {
  try {
    const { basic }=req.authorization;
    if (! basic || basic.username !== 'codelegant' || basic.password !== 'codelegant') {
      return next(new restify.UnauthorizedError('身份验证失败'));
    }
    const docs = await MongoClient
      .connect(url)
      .then(db=>docOperate.findCities(db, ()=>db.close()));

    if (docs.length) return res.send(204);

    const citiesObj = await cawler.citiesObj();
    const citiesArr = [];
    _mapKeys(citiesObj, (cities, key)=> {
      for (const city of cities) {
        city.initials = key;
        citiesArr.push(city);
      }
    });

    const length = await MongoClient
      .connect(url)
      .then(db=> docOperate.insertCities(db, citiesArr, ()=>db.close()));
    return res.send(length ? 201 : 204);
  } catch (e) {
    return next(new restify.InternalServerError('抓取或插入城市列表失败'));
  }
});

server.put('/cities', async(req, res, next)=> {
  try {
    const { basic }=req.authorization;
    if (! basic || basic.username !== 'codelegant' || basic.password !== 'codelegant')
      return next(new restify);

    const docs = await MongoClient
      .connect(url)
      .then(db=>docOperate.findCities(db, ()=>db.close()));

    const citiesObj = await cawler.citiesObj();
    const citiesArr = [];
    _mapKeys(citiesObj, (cities, key)=> {
      for (const city of cities) {
        city.initials = key;
        citiesArr.push(city);
      }
    });

    if (docs.length === citiesArr.length) return res.send(204);

    const length = await MongoClient
      .connect(url)
      .then(db=> docOperate.insertCities(db, citiesArr, ()=>db.close()));
    return res.send(length ? 201 : 204);
  } catch (e) {
    return next(new restify.InternalServerError('更新城市列表失败'));
  }
});

server.get('/movies', async(req, res, next)=> {
  try {

    const { cityId } = req.params;
    if (! cityId) return next(new restify.InvalidArgumentError('只收受 cityId 作为参数'));

    const connect = MongoClient.connect(url);
    const city = await connect
      .then(db=>docOperate.findCityById(db, ()=>db.close(), cityId));

    const { taobaoCityCode, maoyanCityCode, gewaraCityCode }=city.cityCode;
    const movieLists = await Promise
      .all([
        taobao.getHotMovieList(taobaoCityCode),
        maoyan.getHotMovieList(maoyanCityCode),
        gewara.getHotMovieList(gewaraCityCode),
      ])
      .then(movieLists=>movieLists);
    let _movieList = _unionWith(movieLists[0], movieLists[1], movieLists[2],
      (src, target)=> {
        if (src.name == target.name) return target.link = _merge(src.link, target.link);
      });
    _movieList = _remove(_movieList, movie=>movie.link.taobaoLink);
    cliLog.warn(_movieList.length);
    res.json(200, _movieList);
  } catch (e) {
    console.dir(e);
    return next(new restify.InternalServerError('获取热门电影失败'));
  }
});


server.get('/movies/:id', async(req, res)=> {
  res.json(req.params.id);
});


server.listen(8080, ()=> {
  console.log('%s listening at %s', server.name, server.url);
});