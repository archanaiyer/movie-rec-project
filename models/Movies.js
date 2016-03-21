// Model describing one movie.

var mongoose = require('mongoose');

var MovieSchema = new mongoose.Schema({
	genres: [String],
	movie_id: Number,
	name: String,
});

MovieSchema.static('findByMovieId', function (movie_id, callback) {
  return this.findOne({ movie_id: movie_id }, callback);
});

MovieSchema.static('findByMovieIdMulti', function (movie_ids, callback) {
  return this.find({ movie_id: {$in : movie_id }}, callback);
});


mongoose.model('Movie', MovieSchema);