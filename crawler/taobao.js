/* eslint-disable camelcase */
const requestPromise = require('util').promisify(require('request'))
const cheerio = require('cheerio')
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
}
const host = 'https://dianying.taobao.com'

/**
 * @return {Object}
 */
const getCities = async () => {
  const timeStampStr = Date.now().toString()
  const res = await requestPromise({
    uri: `${host}/cityAction.json`,
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

  return JSON.parse(res.body.replace(/jsonp\d{2,3}\((.+)\);$/, '$1'))['returnValue']
}

/**
 * @param city {number}
 * @return {Array}
 */
const getHotMovies = async (city = 440300) => {
  const res = await requestPromise({
    uri: `${host}/showList.htm`,
    method: 'GET',
    qs: {
      city, // 深圳
      n_s: 'new'
    },
    headers
  })
  const _$ = cheerio.load(res.body)

  return _$(_$('.tab-movie-list')[0])
    .find('.movie-card-wrap')
    .toArray()
    .map(movie => {
      const infoList = _$(movie).find('.movie-card-list')
                                .find('span')
                                .toArray()
                                .map(info => _$(info).text())

      const taobaoLink = _$(movie).find('.movie-card-buy').attr('href')

      const img = _$(movie).find('.movie-card-poster')
                           .children('img')
                           .attr('src')

      const name = _$(movie).find('.movie-card-name')
                            .children('.bt-l')
                            .text()

      // 201(3D-IMAX) 202(3D) 203(IMAX)
      const format = _$(movie).find('.movie-card-tag')
                              .find('i')
                              .attr('class')
                              .slice(2)

      const taobaoMovieId = taobaoLink.replace(/.*showId=([0-9]*).*/, '$1')

      return {
        link: {taobaoLink}, // 影片首页，同时也是购票链接
        img, // 缩略图
        name, // 名称,
        format: format ? ~~format : null,
        infoList, // 介绍信息，导演，主演等
        movieId: {taobaoMovieId}  // 电影Id
      }
    })
}

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
const getDetail = async ({// eslint-disable-line
  taobaoCityId,
  cityName,
  taobaoMovieId,
  regionName,
  cinemaId,
  date
}) => {
  /**
   * 获取当前城市的区域信息
   * @param htmlStr {Element}
   * @return {Array}
   */
  const getAreas = htmlStr => {
    const _$ = cheerio.load(htmlStr)
    return _$('a').toArray().map(area => _$(area).text())
  }

  /**
   * 获取影院信息
   * @param htmlStr {Element}
   * @returns {Array}
   */
  const getCinemas = htmlStr => {
    const _$ = cheerio.load(htmlStr)
    return _$('a').toArray()
                  .map(cinema => ({
                    taobaoCinemaId: _$(cinema).data('param').replace(/.*cinemaId=([0-9]*)&.*/, '$1'),
                    name: _$(cinema).text()
                  }))
  }

  /**
   * 电影排期
   * @param _$ {Function}
   * @return {Object}
   */
  const getSchedules = _$ => {
    return _$('.hall-table')
      .find('tbody')
      .find('tr')
      .toArray()
      .map(schedule => ({
        startTime: _$(schedule).find('.hall-time').find('em').text(),
        endTime: (() => {
          const $_HallTime = _$(schedule).find('.hall-time')
          $_HallTime.find('em').remove()
          return $_HallTime.text().trim().replace(/.*(\d{2}:\d{2}).*/, '$1')
        })(),
        type: _$(schedule).find('.hall-type').text().trim(),
        name: _$(schedule).find('.hall-name').text().trim(),
        price: _$(schedule).find('.hall-price').find('em').text(),

        buyLink: _$(schedule).find('.seat-btn').attr('href')
      }))
  }

  const uri = `${host}/showDetailSchedule.htm`
  const cityNameBase64 = Buffer.from(cityName).toString('base64')
  // 设置城市信息 cookie

  const jar = requestPromise.jar()
  const cookie = requestPromise.cookie(`tb_city=${taobaoCityId};tb_cityName=${cityNameBase64}`)
  jar.setCookie(cookie, uri)

  const res = await requestPromise({
    uri,
    jar,
    headers,
    qs: {
      showId: taobaoMovieId,
      regionName,
      cinemaId,
      date,
      ts: Date.now(),
      n_s: 'new'
    }
  })
  const _$ = cheerio.load(res.body)

  const [areaObj, cinemasObj, datesObj] = _$('.select-tags').toArray()
  const areas = getAreas(areaObj)
  const cinemas = getCinemas(cinemasObj)
  const schedules = getSchedules(_$)

  const current = {
    city: _$(areaObj).find('a.current').text(),

    cinema: _$(cinemasObj).find('a.current')
                          .data('param')
                          .replace(/.*cinemaId=([0-9]*)&.*/, '$1'),

    date: _$(datesObj).find('a.current')
                      .data('param')
                      .replace(/.*date=([-0-9]*)&.*/, '$1'),

    address: (() => {
      const $_CinemaBarWrap = _$('.cinemabar-wrap')
      $_CinemaBarWrap.find('h4,a').remove()
      return $_CinemaBarWrap.text().split(' ')[0].trim().replace(/.*：(.*)/, '$1')
    })()
  }
  return {areas, cinemas, schedules, current}
};

(async () => {
  // const cities = await getCities()
  // const name = await getHotMovies()
  // console.log(name)
  // const detail = await getDetail({
  //   taobaoCityId: 440300,
  //   cityName: '深圳',
  //   taobaoMovieId: 155476,
  // });
})()

module.exports = {
  getCities,
  getHotMovies
}
