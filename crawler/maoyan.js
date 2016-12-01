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
  let sitePage = undefined;
  let phInstance = undefined;

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
      if (status !== 'success') throw Error(`StatusCode:${status}`);
      return sitePage.property('content');
    })
    .then(content => {
      const $ = cheerio.load(content);
      const cityEleArr = $('.city-list').find('ul li').toArray();
      const cityList = {};
      for (const city of cityEleArr) {
        const $_List = $(city);
        const key = $_List.find('span').text();
        cityList[key] = $_List.find('a')
                              .toArray()
                              .map(a => ({
                                regionName: $(a).text(),
                                cityCode: Number($(a).attr('data-ci'))
                              }));
      }
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
  const getOnePageList = (offset = 0) =>
    rq({
      uri,
      jar: j,
      headers,
      qs: { showType: 1, offset }
    })
      .then(htmlString => htmlString)
      .catch(e => cliLog.error(e));
  return (async() => {
    let movieList = [];
    let offset = 0;
    let $ = cheerio.load(await getOnePageList());
    const listClassName = '.movie-list';
    let movieEleArr = $(listClassName);
    do {
      movieList=movieList.concat(
        movieEleArr
          .find('dd')
          .toArray()
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
          })
      );
      $ = cheerio.load(await getOnePageList(offset += 30));
      movieEleArr = $(listClassName);
    } while (movieEleArr.length);
    return movieList;
  })();
}


module.exports = {
  getCityList,
  getHotMovieList,
};
