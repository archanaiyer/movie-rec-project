// Main client side app.

var app = angular.module('movieRec', ['ui.router', 'ui.bootstrap']);

app.config([
// Define which URL should direct to which state and what should happen as the state is entered.
	'$stateProvider',
	'$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {
		$stateProvider
			// Welcome state that asks user to either login or register.
			.state('welcome', {
         		url: '/welcome',
         		templateUrl: '/templates/welcome.html',
         		onEnter: ['$state', 'auth', function($state, auth) {
         			if(auth.isLoggedIn()) {
         				$state.go('home');
         			}
         		}]
         	})
         	// Home state that displays an array of recommended movies to rate.
			.state('home', {
				url: '/home',
				templateUrl: '/templates/home.html',
				controller: 'MainCtrl',
				onEnter: ['$state', 'auth', function($state, auth) {
         			if(!auth.isLoggedIn()) {
         				$state.go('welcome');
         			}
         		}],
         		// Pre-load movies before the view is rendered.
         		resolve: {
         			// Get list of (all) recommended movie IDs for current user.
					moviePromise: function(movies) {
						return movies.getRecommendedMovies();
					},
					// Retrive detail information for first six movies.
					movieRecommendationPromise: function(movies, moviePromise) {
						return movies.getMulti(movies.movies_recommended.slice(0,6));
					},
					// Append previously retrived predicted ratings to those movies.
					addPredictedRatingsPromise: function(movies, movieRecommendationPromise) {
						return new Promise(function(resolve, reject) {
							for(i = 0; i < movies.movies.length; i++) {
								movies.movies[i]["predicted_rating"] = movies.predicted_ratings[i];
							}
							resolve();
						});
					}
				}
			})
			// State asking user to login.
         	.state('login', {
         		url: '/login',
         		templateUrl: '/templates/login.html',
         		controller: 'AuthCtrl',
         		onEnter: ['$state', 'auth', function($state, auth) {
         			if(auth.isLoggedIn()) {
         				$state.go('home');
         			}
         		}]
         	})
         	// State asking user to register.
         	.state('register', {
         		url: '/register',
         		templateUrl: '/templates/register.html',
         		controller: 'AuthCtrl',
         		onEnter: ['$state', 'auth', function($state, auth) {
         			if(auth.isLoggedIn()) {
         				$state.go('home');
         			}
         		}]
         	})
         	// Page not found state.
         	.state('404', {
         		url: '/404',
         		templateUrl: '/templates/404.html',
         	})
         	// About page.
         	.state('about', {
         		url: '/about',
         		templateUrl: '/templates/about.html',
         	})
         	// Detail view of movie.
         	.state('detail', {
         		url: '/movies/{movie_id}',
         		templateUrl: '/templates/detail.html',
         		controller: 'DetailCtrl',
         		onEnter: ['$state', 'auth', '$stateParams', function($state, auth, $stateparams) {
         			if(!auth.isLoggedIn()) {
         				$state.go('welcome');
         			}
         		}],
         		resolve: {
					postPromise: ['movies', '$stateParams', function(movies, $stateParams) {
						return movies.getN($stateParams.movie_id, 1);
					}]
				}
         	});
         $urlRouterProvider.otherwise('welcome');
}]);

// Factory for handling authentication related requests.
app.factory('auth', ['$http', '$window', '$state', function($http, $window, $state) {
	var auth = {};

	auth.saveToken = function(token) {
		$window.localStorage['movie-rec-token'] = token;
	};

	auth.getToken = function() {
		return $window.localStorage['movie-rec-token'];
	};

	auth.isLoggedIn = function() {
		var token = auth.getToken();

		if (token) {
			var payload = JSON.parse($window.atob(token.split('.')[1]));
			return payload.exp > Date.now() / 1000;
		} else {
			return false;
		}
	};

	auth.currentUser = function() {
		if (auth.isLoggedIn()) {
			var token = auth.getToken();
			var payload = JSON.parse($window.atob(token.split('.')[1]));

			return payload.username;
		}
	};

	auth.register = function(user) {
		return $http.post('/register', user).success(function(data) {
			auth.saveToken(data.token);
		});
	};


	auth.logIn = function(user) {
		return $http.post('/login', user).success(function(data) {
			auth.saveToken(data.token);
		});
	};

	auth.logOut = function() {
		$window.localStorage.removeItem('movie-rec-token');
		$state.go('welcome');
	};

	return auth;
}])

// Factory for handling movie related requests.
app.factory('movies', ['$http', 'auth', function($http, auth){
	var o = {
		// Actual movies that are currently being displayed.
		movies: [],
		// Array of all recommended movies by movie_id in order of descending predicted ratings.
		movies_recommended: [],
		// Array of all the corresponding predicted ratings.
		predicted_ratings: []
	};

	// Get the first n movies by movie_id, primarily for dev/debugging purposes.
	o.getN = function(movieStartId, movieCount) {
    	return $http.get('/movies?movieStartId=' + movieStartId + '&movieCount=' + movieCount, {headers: {Authorization: 'Bearer ' + auth.getToken()}}).success(function(data){
      		angular.copy(data, o.movies);
    	});
  	};

  	// Get multiple movies defined by an array of movie_ids.
  	o.getMulti = function(movie_ids) {
    	return $http.get('/movies_multi', {headers: {Authorization: 'Bearer ' + auth.getToken()}, params: {movie_ids: movie_ids}}).success(function(data){
      		angular.copy(data, o.movies);
    	});
  	};

  	// Get a single movie by movie_id.
  	o.get = function(movie_id) {
  		return $http.get('/movies/' + movie_id).then(function(res) {
  			return res.data;
  		});
  	};

  	// Rate a single movie as the current user.
  	o.voteOnMovie = function(movie_id, rating) {
  		return $http.post('/movies/' + movie_id + '/rating', {movie_id: movie_id, rating: rating}, {headers: {Authorization: 'Bearer ' + auth.getToken()}});
  	};

  	// Get the rating for one movie as identified by movie_id for the current user.
  	o.getRating = function(movie_id) {
  		return $http.get('/movies/' + movie_id + '/rating', {movie_id: movie_id}, {headers: {Authorization: 'Bearer ' + auth.getToken()}});
  	};

  	// Get all recommended movies for the current user.
  	o.getRecommendedMovies = function() {
  		return $http.get('/movies_recommended', {headers: {Authorization: 'Bearer ' + auth.getToken()}}).success(function(data){
      		angular.copy(data.recommended_movie_ids, o.movies_recommended);
      		angular.copy(data.predicted_ratings, o.predicted_ratings);
    	});
  	};

	return o;
}]);

app.controller('MainCtrl', [
'$scope', 'movies', 'auth',
function($scope, movies, auth){
	// Actual movies that are currently being displayed.
	$scope.movies = movies.movies;
	// Array of all recommended movies by movie_id in order of descending predicted ratings.
	$scope.movies_recommended = movies.movies_recommended;
	// Array of all the corresponding predicted ratings.
	$scope.predicted_ratings = movies.predicted_ratings;
	// Index into recommended movies for first movie being displated right now.
	$scope.movieStartId = 1;
	// Number of movies to be displayed. To change also adjust value in resolve statement of home state!
	$scope.movieCount = 6;

	// Rate a single movie.
	$scope.voteOnMovie = function(movie_id, rating) {
		movies.voteOnMovie(movie_id, rating);

		$scope.isLoggedIn = auth.isLoggedIn;
	};

	// Append predicted ratings to currently displayed movies.
	$scope.addPredictedRatings = function() {
		for(i = 0; i < $scope.movies.length; i++) {
			$scope.movies[i]["predicted_rating"] = $scope.predicted_ratings[$scope.movieStartId + i];
		}
	}

	// Load next movies.
	$scope.nextMovies = function(){
		$scope.movieStartId += $scope.movieCount;
		var next_recommended_movie_ids = $scope.movies_recommended.slice($scope.movieStartId, $scope.movieStartId + $scope.movieCount);
		movies.getMulti(next_recommended_movie_ids).success(function(data) {
			$scope.movies = data;
			$scope.addPredictedRatings();
		});
	};

	// Load previous movies.
	$scope.prevMovies = function() {
	$scope.movieStartId = Math.max($scope.movieStartId - $scope.movieCount, 1);
	var next_recommended_movie_ids = $scope.movies_recommended.slice($scope.movieStartId, $scope.movieStartId + $scope.movieCount);
		movies.getMulti(next_recommended_movie_ids).success(function(data) {
			$scope.movies = data;
			$scope.addPredictedRatings();
		});
	};

  $scope.isLoggedIn = auth.isLoggedIn;
}]);

// Controller for anything authentication related.
app.controller('AuthCtrl', [
	'$scope',
	'$state',
	'auth',
	function($scope, $state, auth) {
		$scope.user = {};

		$scope.register = function() {
			auth.register($scope.user).error(function(error) {
				$scope.error = error;
			}).then(function() {
				$state.go('home');
			});
		};

		$scope.logIn = function() {
			auth.logIn($scope.user).error(function(error){
				$scope.error = error;
			}).then(function(){
				$state.go('home');
			});
		};
	}]);


// Controller for detail views of movies.
app.controller('DetailCtrl', [
	'$scope',
	'auth',
	'movies',
	function($scope, auth, movies) {
		$scope.movie = movies.movies[0];
		$scope.isLoggedIn = auth.isLoggedIn;

	}]);

// Controller for nav bar on top.
app.controller('NavCtrl', [
	'$scope',
	'auth',
	function($scope, auth) {
		$scope.isLoggedIn = auth.isLoggedIn;
		$scope.currentUser = auth.currentUser;
		$scope.logOut = auth.logOut;
	}]);

// Controller for star ratings.
app.controller('RatingCtrl', ['$scope', 'auth', 'movies',
		function ($scope, auth, movies) {
  $scope.rate = 0;
  $scope.max = 5;
  $scope.isReadonly = false;

  $scope.voteOnMovie = function(movie_id, rating) {
  	movies.voteOnMovie(movie_id, $scope.rate * 2);
  };
}]);

app.service('gtm', function ($rootScope, $window) {
    angular.element(document).ready(function () {
        (function (w, d, s, l, i) {
            w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
            var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s),
                dl = l != 'dataLayer' ? '&l=' + l : '';
            j.async = true;
            j.src = '//www.googletagmanager.com/gtm.js?id=' + i + dl;
            f.parentNode.insertBefore(j, f);
        })($window, document, 'script', 'tm', 'GTM-PQCVND');
        //note: I've changed original code to use $window instead of window
    });

    // Note: event is used to trigger the GoogleTagManager tracker, but its value is not sent to the server.
    //      rest of values are sent to server as category, action, label (there's also value if we need it)
    //      ec -> category, ea -> action, el -> label
    // $rootScope.$on('upgradeMembershipClicked', function (event, data) {
    //     if ($window.tm) {
    //         $window.tm.push({ event: 'Paywall', ec: 'Paywall', ea: 'Click', el: data.gtmLabel });
    //     }
    // });
});
