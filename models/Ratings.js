// Model describing one movie rating by a user.

var mongoose = require('mongoose');

var RatingSchema = new mongoose.Schema({
	movie_id : String,
	user_id: String,
	timestamp: Number,
	rating: Number,
});

RatingSchema.index({ movie_id: 1, user_id: 1 }, { unique: true, dropDups: true });

RatingSchema.static('findByUserId', function (user_id, callback) {
  return this.find({ user_id: user_id }, callback);
});

mongoose.model('Rating', RatingSchema);