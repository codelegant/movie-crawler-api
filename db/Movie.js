/**
 * Author: 赖传峰
 * Email: laichuanfeng@hotmail.com
 * homepage: laichuanfeng.com
 */
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const movieSchema = new Schema({
  name: String,
  img: String,
  format: Number,
  infoList: [String],
  movieId: {
    gewaraMovieId: String,
    maoyanMovieId: String,
    taobaoMovieId: String
  },
  cityId: String,
  lastUpdated: Date
})

movieSchema.methods.findByCityId = function () {
  return this.model('Movie').find({cityId: this.cityId})
}

movieSchema.index({lastUpdated: 1}, {expireAfterSeconds: 3600})

const Movie = mongoose.model('Movie', movieSchema)

module.exports = Movie
