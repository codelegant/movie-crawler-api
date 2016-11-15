//--harmony-async-await
const rq = require('request-promise');
const cheerio = require('cheerio');
const cliLog = require('../util/cliLog');
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};

const taobao = (() => ({
  /**
   * @return {Promise.<Object>}
   */
  getCityList() {
    const timeStampStr = Date.now().toString();
    return rq({
      uri: 'http://dianying.taobao.com/cityAction.json',
      method: 'GET',
      qs: {
        _ksTS: `${timeStampStr}_19`,
        jsoncallback: `jsonp20`,
        action: 'cityAction',
        n_s: 'new',
        event_submit_doGetAllRegion: true
      },
      headers
    })
      .then(res =>
        //字段名：[{id,parentId,regionName,cityCode,pinYin}]
        JSON.parse(res.replace(/jsonp\d{2,3}\((.+)\);$/, '$1'))['returnValue']);
  },
  /**
   * @param city {number}
   * @return {Promise.<Array>}
   */
  getHotMovieList(city = 440300) {
    return rq({
      uri: 'http://dianying.taobao.com/showList.htm',
      method: 'GET',
      qs: {
        n_s: 'new',
        city//深圳
      },
      headers,
      transform: body => cheerio.load(body)
    })
      .then($ => {
        const movieList = [];
        const $_MovieList = $($('.tab-movie-list')[0]).find('.movie-card-wrap');
        //.movie-card-wrap>movie-card-tag>.t-201
        for (const movieIndex in $_MovieList) {
          if (movieIndex < $_MovieList.length
            && $_MovieList.hasOwnProperty(movieIndex)) {
            const $_Movie = $($_MovieList[movieIndex]);

            const infoList = [];
            const $_InfoList = $_Movie.find('.movie-card-list').find('span');
            for (const infoIndex in $_InfoList) {
              if (infoIndex < $_InfoList.length
                && $_InfoList.hasOwnProperty(infoIndex)) {
                infoList.push($($_InfoList[infoIndex]).text());
              }
            }

            const taobaoLink = $_Movie
              .find('.movie-card-buy')
              .attr('href');

            const img = $_Movie
              .find('.movie-card-poster')
              .children('img')
              .attr('src');

            const name = $_Movie
              .find('.movie-card-name')
              .children('.bt-l').text();

            const format = $_Movie
              .find('.movie-card-tag')
              .find('i')
              .attr('class')
              .slice(2);

            movieList.push({
              link: {taobaoLink}, //影片首页，同时也是购票链接
              img, //缩略图
              name, //名称,
              format: format ? ~~format : null,//201(3D-IMAX) 202(3D) 203(IMAX)
              infoList, //介绍信息，导演，主演等
            });
          }
        }
        return movieList;
      })
      .catch(e => cliLog.error(e));
  }
}))();

module.exports = taobao;