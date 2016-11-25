//--harmony-async-await
const rq = require('request-promise');
const cheerio = require('cheerio');
const cliLog = require('../libs/cliLog');
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};
const host = 'http://dianying.taobao.com';

/**
 * @return {Promise.<Object>}
 */
function getCityList() {
  const timeStampStr = Date.now().toString();
  return rq({
    uri: `${host}/cityAction.json`,
    method: 'GET',
    qs: {
      _ksTS: `${timeStampStr}_19`,
      jsoncallback: `jsonp20`,
      action: 'cityAction',
      n_s: 'new',
      event_submit_doGetAllRegion: true
    },
    headers,
  })
    .then(res =>
      //字段名：[{id,parentId,regionName,cityCode,pinYin}]
      JSON.parse(res.replace(/jsonp\d{2,3}\((.+)\);$/, '$1'))[ 'returnValue' ]);
}

/**
 * @param city {number}
 * @return {Promise.<Array>}
 */
function getHotMovieList(city) {
  return rq({
    uri: `${host}/showList.htm`,
    method: 'GET',
    qs: {
      n_s: 'new',
      city//深圳
    },
    headers,
    transform: body => cheerio.load(body),
  })
    .then($ => {
      const movieList = [];
      const $_MovieList = $($('.tab-movie-list')[ 0 ]).find('.movie-card-wrap');
      //.movie-card-wrap>movie-card-tag>.t-201
      for (const movieIndex in $_MovieList) {
        if (movieIndex < $_MovieList.length
          && $_MovieList.hasOwnProperty(movieIndex)) {
          const $_Movie = $($_MovieList[ movieIndex ]);

          const infoList = [];
          const $_InfoList = $_Movie.find('.movie-card-list').find('span');
          for (const infoIndex in $_InfoList) {
            if (infoIndex < $_InfoList.length
              && $_InfoList.hasOwnProperty(infoIndex)) {
              infoList.push($($_InfoList[ infoIndex ]).text());
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

          //201(3D-IMAX) 202(3D) 203(IMAX)
          const format = $_Movie
            .find('.movie-card-tag')
            .find('i')
            .attr('class')
            .slice(2);

          const taobaoId = taobaoLink.replace(/.*showId=([0-9]*).*/, '$1');

          //TODO: links->link ids->movieId
          movieList.push({
            links: { taobaoLink }, //影片首页，同时也是购票链接
            img, //缩略图
            name, //名称,
            format: format ? ~ ~ format : null,
            infoList, //介绍信息，导演，主演等
            ids: { taobaoId }  //电影Id
          });
        }
      }
      return movieList;
    })
    .catch(e => cliLog.error(e));
}

function getDetail({ taobaoCityId, cityName, taobaoMovieId, cinemaId, date }) {

  /**
   * 获取当前城市的区域信息
   * @param htmlStr {String}
   * @return {Array}
   */
  function getAreas(htmlStr) {
    const $ = cheerio.load(htmlStr);
    const list = [];
    const $_List = $('a');
    for (const index in $_List) {
      if (index < $_List.length
        && $_List.hasOwnProperty(index)
        && index > 0) {
        const $_Target = $($_List[ index ]);
        list.push($_Target.text());
      }
    }
    return list;
  }

  function getCinemas(htmlStr) {
    const $ = cheerio.load(htmlStr);
    const list = [];
    const $_List = $('a');
    for (const index in $_List) {
      if (index < $_List.length
        && $_List.hasOwnProperty(index)
        && index > 0) {
        const $_Target = $($_List[ index ]);
        list.push({
          taobaoId: $_Target.data('param').replace(/.*cinemaId=([0-9]*).*/, '$1'),
          name: $_Target.text(),
        });
      }
    }
    return list;
  }

  function getDates(htmlStr) {

  }

  function getSchedules(htmlStr) {

  }

  const j = rq.jar();
  const uri = `${host}/showDetailSchedule.htm`;
  const cityNameBase64 = new Buffer(cityName).toString('base64');
  //设置城市信息 cookie
  const cookie = rq.cookie(`tb_city=${taobaoCityId};tb_cityName=${cityNameBase64}`);
  j.setCookie(cookie, uri);

  return rq({
    uri,
    jar: j,
    headers,
    qs: { showId: taobaoMovieId, ts: Date.now(), n_s: 'new' },
    transform: body => cheerio.load(body),
  })
    .then($ => {
      const $selectTags = $('.select-tags');
      const $_Arr = [ $selectTags[ 0 ], $selectTags[ 1 ], $selectTags[ 2 ] ];
      const [areaStr,cinemasStr,datesStr,schedulesStr]= $_Arr;
      const [areas,cinemas,dates,schedules]=[
        getAreas(areaStr),
        getCinemas(cinemasStr),
        getDates(datesStr),
        getSchedules(schedulesStr) ];
      console.log(areas);
      console.log(cinemas);

    })
    .catch(e => cliLog.error(e));
}

getDetail({
  taobaoCityId: 440300,
  cityName: '深圳',
  taobaoMovieId: 156419
});

module.exports = {
  getCityList,
  getHotMovieList,
};