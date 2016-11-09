const restify = require('restify');
const MongoClient = require('mongodb').MongoClient;

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
    return docs.length
      ? res.json(200, docs)
      : next(new restify.NotFoundError('未查询到城市列表'));
  } catch (e) {
    cliLog.error(e);
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

    const citiesArr = await cawler.cities();

    const res = await MongoClient
      .connect(url)
      .then(db=> docOperate.insert(db, citiesArr, 'cities', ()=>db.close()));
    return res.send(res.ops.length ? 201 : 204);
  } catch (e) {
    cliLog.error(e);
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

    const cities = await cawler.cities();
    if (docs.length === cities.length) return res.send(204);

    const res = await MongoClient
      .connect(url)
      .then(db=> docOperate.insert(db, cities, 'cities', ()=>db.close()));

    return res.send(res.ops.length ? 201 : 204);
  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('更新城市列表失败'));
  }
});

server.get('/movies', async(req, res, next)=> {
  try {
    const {cityId} = req.params;
    if (!cityId) return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));

    let docs = await MongoClient
      .connect(url)
      .then(db=>docOperate.findMany(db, 'movies', ()=>db.close()));
    if (docs.length) return res.json(200, docs);//有数据则是直接返回

    let movies = await cawler.movies(cityId);
    movies = movies.map(ele=> {
      ele.cityId = cityId;
      ele.lastUpdated = new Date();
      return ele;
    });

    //region 索引是否存在
    const lastUpdatedExists = await MongoClient
      .connect(url)
      .then(db=>docOperate.indexExists(db, 'movies', ['lastUpdated_1'], ()=>db.close()));
    //endregion
    //region 存入数据库
    const result = await MongoClient
      .connect(url)
      .then(db=> {
        !lastUpdatedExists
        && db
          .collection('movies')
          .createIndex(
            {lastUpdated: 1},
            {expireAfterSeconds: 3600}
          )
          .then(()=>db.close());
        return docOperate.insert(db, movies, 'movies', ()=>db.close());
      });
    //endregion

    return result.ops.length
      ? res.json(200, result.ops)
      : next(new restify.NotFoundError('未查询到热门电影列表'));
  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('获取热门电影失败'));
  }
});

server.put('/movies', async(req, res, next)=> {
  try {
    const {cityId} = req.params;
    if (!cityId) return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));

    let movies = await cawler.movies(cityId);
    movies = movies.map(ele=> {
      ele.cityId = cityId;
      ele.lastUpdated = new Date();
      return ele;
    });

    await MongoClient
      .connect(url)
      .then(db=>docOperate.deleteMany(db, 'movies', {cityId}, ()=>db.close()));

    //region 索引是否存在
    const lastUpdatedExists = await MongoClient
      .connect(url)
      .then(db=>docOperate.indexExists(db, 'movies', ['lastUpdated_1'], ()=>db.close()));
    //endregion

    //region 存入数据库
    const result = await MongoClient
      .connect(url)
      .then(db=> {
        !lastUpdatedExists
        && db
          .collection('movies')
          .createIndex(
            {lastUpdated: 1},
            {expireAfterSeconds: 3600}
          ).then(()=>db.close());
        return docOperate.insert(db, movies, 'movies', ()=>db.close());
      });
    //endregion

    return result.ops.length
      ? res.json(200, result.ops)
      : next(new restify.NotFoundError('未查询到热门电影列表'));

  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('更新电影列表信息失败'));
  }
});

server.get('/movies/:id', async(req, res, next)=> {
});


server.listen(8080, ()=> {
  console.log('%s listening at %s', server.name, server.url);
});
//
// (async()=> {
//   const lastUpdatedExists = await MongoClient
//     .connect(url)
//     .then(db=>docOperate.indexExists(db,'movies',['lastUpdated_1'],()=>db.close()));
//   console.log(lastUpdatedExists);
// })();