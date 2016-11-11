//--harmony-async-await
const rq = require('request-promise');
const cheerio = require('cheerio');
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
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
      .then(res => JSON.parse(res.replace(/jsonp\d{2,3}\((.+)\);$/, '$1'))['returnValue']);//字段名：[{id,parentId,regionName,cityCode,pinYin}]
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
        for (const movieIndex in $_MovieList) {
          if (movieIndex < $_MovieList.length
            && $_MovieList.hasOwnProperty(movieIndex)) {
            const $_Movie = $($_MovieList[movieIndex]);

            const infoList = [];
            const $_InfoList = $_Movie.find('.movie-card-list').find('span');
            for (const infoIndex in $_InfoList) {
              if (infoIndex < $_InfoList.length
                && $_InfoList.hasOwnProperty(infoIndex)) {
                infoList.push($($_InfoList[infoIndex]).text())
              }
              ;
            }

            movieList.push({
              link: {taobaoLink: $_Movie.find('.movie-card-buy').attr('href')}, //影片首页，同时也是购票链接
              img: $_Movie.find('.movie-card-poster').children('img').attr('src'), //缩略图
              name: $_Movie.find('.movie-card-name').children('.bt-l').text(), //名称,
              infoList //介绍信息，导演，主演等
            });
          }
        }
        return movieList;
      })
  }
}))();

module.exports = taobao;