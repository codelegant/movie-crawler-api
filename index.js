const restify = require('restify');

const cawler = require('./cawler/index');
const cliLog = require('./libsk/cliLog');
const MovieDb = require('./db/MovieDb');

const server = restify.createServer();
server.use(restify.queryParser());//使用 req.params，可以获取查询对象

server.get('/cities',
  async(req, res, next) => {
    try {
      const movieDb = new MovieDb();
      const docs = await movieDb.findMany('cities');

      if (docs.length) return res.json(200, docs);//有数据则是直接返回
      return next();//从各网站抓取

    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市列表失败'));
    }
  },
  async(req, res, next) => {
    try {
      const citiesArr = await cawler.cities();
      const movieDb = new MovieDb();
      const result = await movieDb.insert('cities', citiesArr);
      return result.ops.length
        ? res.json(200, result.ops)
        : next(new restify.NotFoundError('未查询到城市列表'));
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市列表失败'));
    }
  });

server.put('/cities', async(req, res, next) => {
  try {
    const movieDb = new MovieDb();
    await movieDb.deleteMany('cities', {});

    const cities = await cawler.cities();
    const result = await movieDb.insert('cities', citiesArr);

    return res.send(result.ops.length ? 201 : 204);
  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('更新城市列表失败'));
  }
});

server.get('/movies', async(req, res, next) => {
    try {
      const {cityId} = req.params;
      if (!cityId) return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));

      const movieDb = new MovieDb();

      const moviesExists = await movieDb.collectionExists('movies', false);
      if (!moviesExists) {
        await movieDb.client.then(db => db.createCollection('movies'));
        return next();
      }

      const docs = await movieDb.findMany('movies', true, {cityId});
      if (docs.length) return res.json(200, docs);//有数据则是直接返回
      return next();//从各网站抓取

    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取热门电影失败'));
    }
  },
  async(req, res, next) => {
    try {
      const {cityId} = req.params;
      if (!cityId) return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));

      let movies = await cawler.movies(cityId);
      movies = movies.map(ele => {
        ele.cityId = cityId;
        ele.lastUpdated = new Date();
        return ele;
      });

      const movieDb = new MovieDb();

      //region 索引是否存在
      const lastUpdatedExists = movieDb.indexExists('movies', ['lastUpdated_1'], false);
      //endregion

      //region 存入数据库，插入索引
      const result = await movieDb.insert('movies', movies);

      !lastUpdatedExists
      && await movieDb
        .client
        .then(
          db => db
            .collection('movies')
            .createIndex(
              {lastUpdated: 1},
              {expireAfterSeconds: 3600}
            )
            .then(() => db.close())
        );
      //endregion

      return result.ops.length
        ? res.json(200, result.ops)
        : next(new restify.NotFoundError('未查询到热门电影列表'));
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取热门电影失败'));
    }
  });

server.put('/movies', async(req, res, next) => {
  try {
    const {cityId} = req.params;
    if (!cityId) return next(new restify.InvalidArgumentError('只接受 cityId 作为参数'));

    let movies = await cawler.movies(cityId);
    movies = movies.map(ele => {
      ele.cityId = cityId;
      ele.lastUpdated = new Date();
      return ele;
    });

    const movieDb = new MovieDb();
    await movieDb.deleteMany('movies', false, {cityId});

    //region 索引是否存在
    const lastUpdatedExists = movieDb.indexExists('movies', ['lastUpdated_1']);
    //endregion

    //region 存入数据库，插入索引
    const result = await movieDb.insert('movies', movies);

    !lastUpdatedExists
    && await movieDb
      .client
      .then(
        db => db
          .collection('movies')
          .createIndex(
            {lastUpdated: 1},
            {expireAfterSeconds: 3600}
          )
          .then(() => db.close())
      );
    //endregion

    return res.send(result.ops.length ? 201 : 204);

  } catch (e) {
    cliLog.error(e);
    return next(new restify.InternalServerError('更新电影列表信息失败'));
  }
});

server.get('/movies/:id', async(req, res, next) => {
});

server.listen(8080, () => {
  console.log('%s listening at %s', server.name, server.url);
});

(async() => {
  // const lastUpdatedExists = await MongoClient
  //   .connect(url)
  //   .then(db=>docOperate.indexExists(db,'movies',['lastUpdated_1'],()=>db.close()));
  // console.log(lastUpdatedExists);
  // MongoClient
  //   .connect(url)
  //   .then(async db=> {
  //     var msg = await dbController.collectionExists(db, 'movies', ()=>db.close());
  //     cliLog.warn(msg);
  //   })
})();