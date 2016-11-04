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
    const docs = await MongoClient
      .connect(url)
      .then(db=> {
        return docOperate.findCities(db, ()=>db.close());
      });
    const statusCode = docs.length ? 200 : 404;
    res.json(statusCode, docs);
  } catch (e) {
    cliLog.error(e);
    res.json(500, []);
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

// (async()=> {
//   const docs = await MongoClient
//     .connect(url)
//     .then(db=> {
//       return docOperate.findCities(db, ()=>db.close());
//     });
//   cliLog.info(docs.length);
// })();
// (async()=> {
//   const citiesObj = await cawler.citiesObj();
//   const citiesArr = [];
//   _mapKeys(citiesObj, (cities, key)=> {
//     for (const city of cities) {
//
//       city.initials = key;
//       citiesArr.push(city);
//     }
//   });
//   MongoClient
//     .connect(url)
//     .then(db=> {
//       docOperate.insertCities(db, citiesArr, ()=>db.close());
//     })
//     .catch(err=>cliLog.error(err))
// })();


server.listen(8080, ()=> {
  console.log('%s listening at %s', server.name, server.url);
});