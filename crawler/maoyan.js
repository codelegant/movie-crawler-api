//--harmony-async-await
const phantom = require('phantom');
const rq = require('request-promise');
const cheerio = require('cheerio');
const cliLog = require('../libs/cliLog');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};

/**
 * @return {Promise.<Array>}
 */
function getCityList() {
  let sitePage = null;
  let phInstance = null;

  return phantom
    .create()
    .then(instance => {
      phInstance = instance;
      return instance.createPage();
    })
    .then(page => {
      sitePage = page;
      return page.open('http://maoyan.com/');
    })
    .then(status => {
      if (status !== 'success') return cliLog.error(`StatusCode:${status}`);
      return sitePage.property('content');
    })
    .then(content => {
      const $ = cheerio.load(content);
      const cityList = {};
      $('.city-list')
        .find('li')
        .toArray()
        .forEach(city => {
          const key = $(city).find('span').text();
          cityList[key] = $(city).find('a')
                                 .toArray()
                                 .map(a => ({
                                   regionName: $(a).text(),
                                   cityCode: Number($(a).attr('data-ci'))
                                 }));
        });
      sitePage.close();
      phInstance.exit();
      return cityList;
    })
    .catch(e => cliLog.error(e));
}

/**
 * @param cityCode {Number}
 * @return {Promise.<Object>}
 */
function getHotMovieList(cityCode = 30) {
  const j = rq.jar();
  const uri = 'http://maoyan.com/films';
  const cookie = rq.cookie(`ci=${cityCode}`);//设置城市 cookie ，深圳
  j.setCookie(cookie, uri);

  function getOnePageList(offset = 0) {
    return rq({
      uri,
      jar: j,
      headers,
      qs: { showType: 1, sortId: 1, offset }
    })
      .then(htmlString => htmlString)
      .catch(e => cliLog.error(e));
  }

  return (async() => {
    let $ = cheerio.load(await getOnePageList());
    let offset = 0;
    const listClassName = '.movie-list';
    const movieEleArr = $(listClassName).find('dd').toArray();
    let movieEleLength = movieEleArr.length;

    do {
      $ = cheerio.load(await getOnePageList(offset += 30));
      const currentPageArr = $(listClassName).find('dd').toArray();
      movieEleLength = currentPageArr.length;
      Array.prototype.push.apply(movieEleArr, currentPageArr);
    } while (movieEleLength);

    return movieEleArr
      .map(dd => {
        const id = $(dd)
          .find('.movie-item a')
          .data('val')
          .replace(/{[a-z]+:(\d+)}/gi, '$1');
        return {
          link: {
            maoyanLink: `http://www.meituan.com/dianying/${id}?#content`
          }, //影片首页，同时也是购票链接
          name: $(dd).find('.movie-item-title').attr('title'), //名称,
          movieId: {
            maoyanId: id,
          }
        }
      });
  })();
}

module.exports = {
  getCityList,
  getHotMovieList,
};
