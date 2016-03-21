// Main server side app.

var express = require('express');
var router = express.Router();
var passport = require('passport');
var jwt = require('express-jwt');
var auth = jwt({secret: 'SECRET STRING here that is shared between index.js and Users.js', userProperty: 'payload'});

var tmdb = require('tmdbv3').init('ENTER YOUR TMDB KEY HERE!');
var MovieDB = require('moviedb')('ENTER YOUR TMDB KEY HERE!');

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Movie = mongoose.model('Movie');
var Rating = mongoose.model('Rating');
var Recommendation = mongoose.model('Recommendation');

var Promises = require('promise');

// Register as new user.
router.post('/register', function(req, res, next) {
	if(!req.body.username || !req.body.password) {
		return res.status(400).json({message: 'Please fill out all fields'});
	}

	var user = new User();

	user.username = req.body.username;

	user.setPassword(req.body.password);

	user.save(function (err) {
		if(err) {return next(err);}

		return res.json({token: user.generateJWT()})
	});
});

// Login as existing user.
router.post('/login', function(req, res, next) {
	if(!req.body.username || !req.body.password) {
		return res.status(400).json({message: 'Please fill out all fields'});
	}

	passport.authenticate('local', function(err, user, info) {
		if (err) {return next(err);}

		if(user) {
			return res.json({token: user.generateJWT()});
		} else {
			return res.status(401).json(info);
		}
	})(req, res, next);
});

// Get rating and additional info (from TMDb) for movie.
var getRatingAndInfo = function(err, movie, user_id, resolve) {
	return function(err, rating, i){
		if(err) {return next(err);}
		movie = movie.toJSON();
		if (rating === null) {
			movie["rating"] = 0;
		} else {
			movie["rating"] = rating.rating;
		}

		MovieDB.movieInfo({id: movie.tmdb_id}, function(err, result){
			if(result === null || result === undefined){
					movie["thumbnail"] = "";
					movie["info"] = "";
				} else {
					movie["thumbnail"] = "https://image.tmdb.org/t/p/w154/" + result["poster_path"]
					movie["info"] = result;
				}
				resolve(movie);
		});
	};
};

// Helper function for intersecting two lists.
var intersection = function(movie_ids, ratings){
	var hash_set ={};

	for (var i = 0; i < ratings.length; i++) {
		hash_set[ratings[i].movie_id] = true;
	}


	var result = [];

	for(var i = 0; i < movie_ids.length; i++) {
		if(!hash_set[movie_ids[i]]) {
			result.push(movie_ids[i]);
		}
	}
	
    return result;
};

// Retrieve movies to display.
router.get('/movies', auth, function(req, res, next) {
	// Number of movies to retrieve.
	var count = parseInt(req.query.movieCount);
	// First movie_id to retrieve
	var startId = parseInt(req.query.movieStartId);
	// Last movie_id to retrieve.
	var endId = startId + count;

	// Every movie in between startId and endId will be fetched.

	Movie.find({movie_id: { $gte: startId, $lt: endId }}, function(err, movies){
		if(err) {return next(err);}

		var promises = movies.map(function(movie) {
			var query = {'movie_id': movie.movie_id, 
				 'user_id': req.payload.username};	

			return new Promise(function(resolve, reject) {
				Rating.findOne(query, getRatingAndInfo(err, movie, req.payload.username, resolve));
				});
		});

		Promises.all(promises).then(function(movies_and_ratings_and_info){
			res.json(movies_and_ratings_and_info);
		});
		
	}).limit(count);
});

// Retrieve multiple movies defined by array of movie_ids.
router.get('/movies_multi', auth, function(req, res, next) {
	// movie_ids of movies to retrieve.
	var movie_ids = req.query.movie_ids;

	Movie.find({movie_id: { $in: movie_ids }}, function(err, movies){
		if(err) {return next(err);}
		var promises = movies.map(function(movie) {
			var query = {'movie_id': movie.movie_id, 
				 'user_id': req.payload.username};	

			return new Promise(function(resolve, reject) {
				Rating.findOne(query, getRatingAndInfo(err, movie, req.payload.username, resolve));
				});
		});

		Promises.all(promises).then(function(movies_and_ratings_and_info){
			res.json(movies_and_ratings_and_info);
		});
		
	});
});

// Fill in info for one movie, not currently used.
router.param('movie', function(req, res, next, movie_id) {
	var query = Movie.findByMovieId(movie_id);

	query.exec(function(err, movie) {
		if (err) { return next(err) ;}
		if (!movie) {return next(new Error('can\'t find movie'));}
		var func = function(err, movie) {
				return function(err, rating, i){
					if(err) {return next(err);}
					movie = movie.toJSON();
					movie["rating"] = rating.rating;
				}
			}
		Rating.findOne(query, func(err, movie));
		req.movie = movie;
		return next();
	});
});

// Get recommended movies for current user.
router.get('/movies_recommended', auth, function(req, res, next) {
	var username = req.payload.username;
	var query = Recommendation.findByUserId(username);

	query.exec(function(err, recommendations) {
		if (err) { return next(err) ;}
		if (!recommendations) {
			// No recommendations yet -> Fill with dummy data.
			recommendations = {};
			recommendations["recommended_movie_ids"] = [];
			recommendations["predicted_ratings"] = [];
			for(i = 0; i < 1000; i++){
				recommendations["recommended_movie_ids"][i] = i + 1;
				recommendations["predicted_ratings"][i] = 0;				
			}
		}

		var query2 = Rating.findByUserId(username);
		query2.exec(function(err, ratings) {
			if (err) { return next(err) ;}
			var intersected = intersection(recommendations["recommended_movie_ids"], ratings);
			recommendations["recommended_movie_ids"] = intersected;
			res.json(recommendations);
		});
	});
});

// Add/Update rating for a movie.
router.post('/movies/:movie_id/rating', auth, function(req, res, next) {
	var rating = new Rating();
	rating.user_id = req.payload.username;
	rating.movie_id = req.body.movie_id;
	rating.rating = req.body.rating;
	var query = {'movie_id': rating.movie_id, 'user_id': rating.user_id};
	var timestamp = Math.round(+new Date()/1000);
	Rating.findOneAndUpdate(query, {$set: { rating: rating.rating, timestamp: timestamp}}, {upsert: true}, function(err, doc){
		if (err) {return next(err); }
		res.json(rating);
	});
});

// Get rating for one movie.
router.get('/movies/:movie_id/rating', function(req, res, next) {
	var query = {'movie_id': rating.movie_id, 'user_id': rating.user_id};
	Rating.findOne(query, function(err, rating){
		if(err) {return next(err);}
		res.json(rating);
	});
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
