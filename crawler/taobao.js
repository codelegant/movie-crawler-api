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
const getCityList = () => {
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
      JSON.parse(res.replace(/jsonp\d{2,3}\((.+)\);$/, '$1'))['returnValue']);
};

/**
 * @param city {number}
 * @return {Promise.<Array>}
 */
const getHotMovieList = (city = 440300) => {
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
    .then($ =>
      $($('.tab-movie-list')[0])
        .find('.movie-card-wrap')
        .toArray()
        .map(movie => {
          const infoList = $(movie).find('.movie-card-list')
                                   .find('span')
                                   .toArray()
                                   .map(info => $(info).text());

          const taobaoLink = $(movie).find('.movie-card-buy').attr('href');

          const img = $(movie).find('.movie-card-poster')
                              .children('img')
                              .attr('src');

          const name = $(movie).find('.movie-card-name')
                               .children('.bt-l')
                               .text();

          //201(3D-IMAX) 202(3D) 203(IMAX)
          const format = $(movie).find('.movie-card-tag')
                                 .find('i')
                                 .attr('class')
                                 .slice(2);

          const taobaoMovieId = taobaoLink.replace(/.*showId=([0-9]*).*/, '$1');

          return {
            link: { taobaoLink }, //影片首页，同时也是购票链接
            img, //缩略图
            name, //名称,
            format: format ? ~ ~ format : null,
            infoList, //介绍信息，导演，主演等
            movieId: { taobaoMovieId }  //电影Id
          };
        })
    )
    .catch(e => cliLog.error(e));
};

/**
 * 获取区域，影院，排期等信息
 * @param taobaoCityId {Number} 淘宝的城市 ID
 * @param cityName {String} 城市名称
 * @param taobaoMovieId {Number} 淘宝的电影 ID
 * @param regionName {String} 城市下属区域的名称
 * @param cinemaId {Number} 影院的 ID
 * @param date {Date} 日期
 * @return {Promise.<Object>}
 */
const getDetail = ({ taobaoCityId, cityName, taobaoMovieId, regionName, cinemaId, date }) => {

  /**
   * 获取当前城市的区域信息
   * @param htmlStr {Element}
   * @return {Array}
   */
  const getAreas = htmlStr => {
    const $ = cheerio.load(htmlStr);
    return $('a').toArray().map(area => $(area).text());
  };

  /**
   * 获取影院信息
   * @param htmlStr {Element}
   * @returns {Array}
   */
  const getCinemas = htmlStr => {
    const $ = cheerio.load(htmlStr);
    return $('a').toArray().map(cinema => ({
      taobaoCinemaId: $(cinema).data('param').replace(/.*cinemaId=([0-9]*)&.*/, '$1'),
      name: $(cinema).text(),
    }))
  };

  /**
   * 电影排期
   * @param $ {Function}
   * @return {Object}
   */
  const getSchedules = $ => {
    return $('.hall-table')
      .find('tbody')
      .find('tr')
      .toArray()
      .map(schedule => ({
        startTime: $(schedule).find('.hall-time').find('em').text(),
        endTime: (() => {
          const $_HallTime = $(schedule).find('.hall-time');
          $_HallTime.find('em').remove();
          return $_HallTime.text().trim().replace(/.*(\d{2}:\d{2}).*/, '$1');
        })(),
        type: $(schedule).find('.hall-type').text().trim(),
        name: $(schedule).find('.hall-name').text().trim(),
        price: $(schedule).find('.hall-price').find('em').text(),
        buyLink: $(schedule).find('.seat-btn').attr('href'),
      }));
  };

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
    qs: {
      showId: taobaoMovieId,
      regionName,
      cinemaId,
      date,
      ts: Date.now(),
      n_s: 'new'
    },
    transform: body => cheerio.load(body),
  })
    .then($ => {
      const [areaObj,cinemasObj,datesObj]=$('.select-tags').toArray();
      const [areas,cinemas,schedules]=[getAreas(areaObj), getCinemas(cinemasObj), getSchedules($)];
      const current = {
        city: $(areaObj).find('a.current').text(),

        cinema: $(cinemasObj).find('a.current')
                             .data('param')
                             .replace(/.*cinemaId=([0-9]*)&.*/, '$1'),

        date: $(datesObj).find('a.current')
                         .data('param')
                         .replace(/.*date=([-0-9]*)&.*/, '$1'),

        address: (() => {
          const $_CinemaBarWrap = $('.cinemabar-wrap');
          $_CinemaBarWrap.find('h4,a').remove();
          return $_CinemaBarWrap.text().split(' ')[0].trim().replace(/.*：(.*)/, '$1');
        })()
      };
      return { areas, cinemas, schedules, current };
    })
    .catch(e => cliLog.error(e));
};


(async() => {
  const test = await getDetail({
    taobaoCityId: 440300,
    cityName: '深圳',
    taobaoMovieId: 178125
  });
  console.log(test);
  // console.log(await getHotMovieList(440300));
})();
module.exports = {
  getCityList,
  getHotMovieList,
};