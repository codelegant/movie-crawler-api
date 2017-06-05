const requestPromise = require('util').promisify(require('request'))
const cheerio = require('cheerio')
// const cliLog = require('../libs/cliLog')
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
}

/**
 * @param cityCode {Number}
 * @return {Promise.<Array>}
 */
const getHotMovies = async (cityCode = 440300) => {
  const uri = 'http://www.gewara.com/movie/searchMovie.xhtml'
  const cookie = requestPromise.cookie(`citycode=${cityCode}`)// 设置城市 cookie，深圳

  const jar = requestPromise.jar()
  jar.setCookie(cookie, uri)

  const getOnePageList = async (pageNo = 0) => {
    const res = await requestPromise({
      uri,
      jar,
      headers,
      qs: {pageNo}
    })
    return res.body
  }

  let pageNo = 0
  let _$ = cheerio.load(await getOnePageList())
  const listClassName = 'li.effectLi'
  const movieEleArr = _$(listClassName).toArray()
  let movieEleLength = movieEleArr.length

  do {
    _$ = cheerio.load(await getOnePageList(pageNo += 1))
    const currentPageArr = _$(listClassName).toArray()
    movieEleLength = currentPageArr.length
    Array.prototype.push.apply(movieEleArr, currentPageArr)
  } while (movieEleLength)

  return movieEleArr
    .map(movie => {
      if (!_$(movie).find('a.redBt').attr('href')) return null
      const name = _$(movie).find('.ui_movieType').attr('title')
      const gewaraLink = 'http://www.gewara.com' +
        _$(movie).find('a.redBt').attr('href')
      return {
        link: {
          gewaraLink
        }, // 影片首页，同时也是购票链接
        name, // 名称,
        movieId: {
          gewaraMovieId: gewaraLink.replace(/.*\/movie\/([0-9]*)/, '$1')
        }
      }
    })
    .filter(ele => !!ele)
}

module.exports = {
  getHotMovies
}
