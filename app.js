const restify = require('restify');
const http_debug = require('debug')('http_debug');

const city = require('./routes/city');
const movie = require('./routes/movie');

const server = restify.createServer({
  name: 'movie-cawler-api',
  version: '0.0.1',
});
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
  http_debug('%s listening at %s', server.name, server.url);
});