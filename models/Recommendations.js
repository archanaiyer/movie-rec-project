// Model describing ALL movie recommendations and predicted ratings for one user.

var mongoose = require('mongoose');

var RecommendationSchema = new mongoose.Schema({
	user_id: String,
	predicted_ratings: [Number],
	recommended_movie_ids: [Number]
});

RecommendationSchema.static('findByUserId', function (user_id, callback) {
  return this.findOne({user_id: user_id }, callback);
});

mongoose.model('Recommendation', RecommendationSchema);