const rq = require('request-promise');
const cheerio = require('cheerio');
const cliLog = require('../libs/cliLog');
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};

const gewara = (() => ({
  //城市列表数据使用与淘宝一致
  /**
   * @param cityCode {Number}
   * @return {Promise.<Array>}
   */
  getHotMovieList(cityCode = 440300){
    const j = rq.jar();
    const uri = 'http://www.gewara.com/movie/searchMovie.xhtml';
    const cookie = rq.cookie(`citycode=${cityCode}`);//设置城市 cookie，深圳
    j.setCookie(cookie, uri);
    const getOnePageList = (pageNo = 0) => rq({
      uri,
      jar: j,
      headers,
      qs: { pageNo }
    })
      .then(htmlString => htmlString)
      .catch(e => cliLog.error(e));
    return (async () => {
      let movieList = [];
      let pageNo = 0;
      let $ = cheerio.load(await getOnePageList());
      const listClassName = 'li.effectLi';
      let $_MovieList = $(listClassName);
      do {
        for (const movieIndex in $_MovieList) {
          if (movieIndex < $_MovieList.length
            && $_MovieList.hasOwnProperty(movieIndex)) {
            const $_Movie = $($_MovieList[ movieIndex ]);
            if ($_Movie.find('a.redBt').attr('href')) {
              const gewaraLink = 'http://www.gewara.com'
                + $_Movie
                  .find('a.redBt')
                  .attr('href');

              const name = $_Movie.find('.ui_movieType').attr('title');
              movieList.push({
                link: {
                  gewaraLink: gewaraLink
                }, //影片首页，同时也是购票链接
                name: name, //名称,
              });
            }
          }
        }
        $ = cheerio.load(await getOnePageList(pageNo += 1));
        $_MovieList = $(listClassName);
      } while ($_MovieList.length);
      return movieList;
    })();
  }
}))();
module.exports = gewara;
