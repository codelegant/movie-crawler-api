const restify = require('restify');
const debug = require('debug')('debug');

const cawler = require('./cawler/index');
const city = require('./routes/city');
const movie = require('./routes/movie');

const server = restify.createServer();
server.use(restify.queryParser());//使用 req.query，可以获取查询对象

server.get(
  '/cities',
  city.getFromDb,
  city.getFromCawler
);

server.get(
  {
    name: 'regionName',
    path: '/cities',
  },
  //TODO 数据库为空时的情况
  city.getByRegionNameFromDb,
  city.getByRegionNameFromCawler
);

server.put('/cities', city.put);

server.get(
  '/movies',
  movie.getByCityIdFromDb,
  movie.getByCityIdFromCawler
);

server.put('/movies', movie.put);

server.get('/movies/:id', movie.getById);

server.listen(8080, () => {
  debug('%s listening at %s', server.name, server.url);
});