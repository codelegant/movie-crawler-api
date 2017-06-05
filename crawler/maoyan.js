const phantom = require('phantom')
const requestPromise = require('util').promisify(require('request'))
const cheerio = require('cheerio')
const cliLog = require('../libs/cliLog')

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
}

/**
 * @return {Object}
 */
const getCities = async () => {
  const instance = await phantom.create()
  const page = await instance.createPage()
  const status = await page.open('http://maoyan.com/')

  if (status !== 'success') {
    cliLog.error(`无法获取 http://maoyan.com，statusCode：${status}`)
  }

  const content = await page.property('content')
  await instance.exit()
  const _$ = cheerio.load(content)
  const cityList = {}

  _$('.city-list')
    .find('li')
    .toArray()
    .forEach(city => {
      const key = _$(city).find('span').text()
      cityList[key] = _$(city).find('a')
                              .toArray()
                              .map(a => ({
                                regionName: _$(a).text(),
                                cityCode: Number(_$(a).attr('data-ci'))
                              }))
    })

  return cityList
}

/**
 * @param cityCode {Number}
 * @return {Promise.<Object>}
 */
const getHotMovies = async (cityCode = 30) => {
  const j = requestPromise.jar()
  const uri = 'http://maoyan.com/films'
  const cookie = requestPromise.cookie(`ci=${cityCode}`)// 设置城市 cookie ，深圳
  j.setCookie(cookie, uri)

  const getOnePageList = async (offse = 0) => {
    const res = await requestPromise({
      uri,
      jar: j,
      headers,
      qs: {showType: 1, sortId: 1, offset}
    }).catch(e => cliLog.error(e))
    return res.body
  }

  let offset = 0
  let _$ = cheerio.load(await getOnePageList())
  const listClassName = '.movie-list'
  const movieEleArr = _$(listClassName).find('dd').toArray()
  let movieEleLength = movieEleArr.length

  do {
    _$ = cheerio.load(await getOnePageList(offset += 30))
    const currentPageArr = _$(listClassName).find('dd').toArray()
    movieEleLength = currentPageArr.length
    Array.prototype.push.apply(movieEleArr, currentPageArr)
  } while (movieEleLength)

  return movieEleArr
    .map(dd => {
      const id = _$(dd)
        .find('.movie-item a')
        .data('val')
        .replace(/{[a-z]+:(\d+)}/gi, '$1')
      return {
        link: {
          maoyanLink: `http://www.meituan.com/dianying/${id}?#content`
        }, // 影片首页，同时也是购票链接
        name: _$(dd).find('.movie-item-title').attr('title'), // 名称,
        movieId: {
          maoyanMovieId: id
        }
      }
    })
};

(async () => {
  const cities = await getHotMovies()
  console.log(cities)
})()

module.exports = {
  getCities,
  getHotMovies
}
