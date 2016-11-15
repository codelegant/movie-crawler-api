//--harmony-async-await
const phantom = require('phantom');
const rq = require('request-promise');
const cheerio = require('cheerio');
const cliLog = require('../libs/cliLog');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};

const maoyan = (() => ({
  /**
   * @return {Promise.<Array>}
   */
  getCityList() {
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
        const $_CityList = $('.city-list').find('ul li');
        const cityList = {};
        for (const listIndex in $_CityList) {
          if (listIndex < $_CityList.length && $_CityList.hasOwnProperty(listIndex)) {
            const $_List = $($_CityList[ listIndex ]);
            const key = $_List.find('span').text();
            cityList[ key ] = [];
            const $_AList = $_List.find('a');
            for (const aIndex in $_AList) {
              if (aIndex < $_AList.length && $_AList.hasOwnProperty(aIndex)) {
                const $_A = $($_AList[ aIndex ]);
                cityList[ key ].push({
                  regionName: $_A.text(),
                  cityCode: Number($_A.attr('data-ci'))
                });
              }
            }
          }
        }
        sitePage.close();
        phInstance.exit();
        return cityList;
      })
      .catch(e => cliLog.error(e));
  },
  /**
   * @param cityCode {Number}
   * @return {Promise.<Object>}
   */
  getHotMovieList(cityCode = 30) {
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
    return (async () => {
      let movieList = [];
      let offset = 0;
      let $ = cheerio.load(await getOnePageList());
      const listClassName = '.movie-list';
      let $_MovieList = $(listClassName);
      do {
        const $_DdList = $_MovieList.find('dd');
        for (const ddIndex in $_DdList) {
          if (ddIndex < $_DdList.length && $_DdList.hasOwnProperty(ddIndex)) {
            const $_Dd = $($_DdList[ ddIndex ]);
            const id = $_Dd
              .find('.movie-item a')
              .data('val')
              .replace(/{[a-z]+:(\d+)}/gi, '$1');
            movieList.push({
              link: {
                maoyanLink: `http://www.meituan.com/dianying/${id}?#content`
              }, //影片首页，同时也是购票链接
              name: $_Dd.find('.movie-item-title').attr('title'), //名称,
            });
          }
        }
        $ = cheerio.load(await getOnePageList(offset += 30));
        $_MovieList = $(listClassName);
      } while ($_MovieList.length);
      return movieList;
    })();
  }
}))();
module.exports = maoyan;