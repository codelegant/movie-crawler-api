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
      .then(db=>docOperate.findMany(db, 'cities', ()=>db.close()));
    return docs.length ? res.json(200, docs) : next(new restify.NotFoundError('未查询到城市列表'));
  } catch (e) {
    return next(new restify.InternalServerError('获取城市列表失败'));
  }
});

server.post('/cities', async(req, res, next)=> {
  try {
    const {basic}=req.authorization;
    if (!basic || basic.username !== 'codelegant' || basic.password !== 'codelegant') {
      return next(new restify.UnauthorizedError('身份验证失败'));
    }
    const docs = await MongoClient
      .connect(url)
      .then(db=>docOperate.findMany(db, 'cities', ()=>db.close()));

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
      .then(db=> docOperate.insert(db, citiesArr, 'cities', ()=>db.close()));
    return res.send(length ? 201 : 204);
  } catch (e) {
    return next(new restify.InternalServerError('抓取或插入城市列表失败'));
  }
});

server.put('/cities', async(req, res, next)=> {
  try {
    const {basic}=req.authorization;
    if (!basic || basic.username !== 'codelegant' || basic.password !== 'codelegant')
      return next(new restify);

    const docs = await MongoClient
      .connect(url)
      .then(db=>docOperate.findMany(db, 'cities', ()=>db.close()));

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
      .then(db=> docOperate.insert(db, citiesArr, 'cities', ()=>db.close()));
    return res.send(length ? 201 : 204);
  } catch (e) {
    return next(new restify.InternalServerError('更新城市列表失败'));
  }
});

server.get('/movies', async(req, res, next)=> {
  try {
    const {cityId} = req.params;
    if (!cityId) return next(new restify.InvalidArgumentError('只收受 cityId 作为参数'));

    //region 获取各个网站对就的 cityCode
    const city = await MongoClient
      .connect(url)
      .then(db=>docOperate.findById(db, 'cities', ()=>db.close(), cityId));
    //endregion

    //region 抓取热门电影
    const {taobaoCityCode, maoyanCityCode, gewaraCityCode}=city.cityCode;
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
    //endregion

    _movieList = _movieList.map(ele=> {
      ele.cityId = cityId;
      ele.lastUpdated = new Date();
      return ele;
    });

    //region 存入数据库
    await MongoClient
      .connect(url)
      .then(db=> {
        docOperate.insert(db, _movieList, 'movies', ()=>db.close());
        db.collection('movies').createIndex({lastUpdated: 1}, {expireAfterSeconds: 3600});
      });
    //endregion

    const docs = await MongoClient
      .connect(url)
      .then(db=>docOperate.findMany(db, 'movies', ()=>db.close()));

    return docs.length ? res.json(200, docs) : next(new restify.NotFoundError('未查询到热门电影列表'));
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