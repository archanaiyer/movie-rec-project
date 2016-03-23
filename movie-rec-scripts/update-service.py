from pymongo import MongoClient
import time
from rec import rec_finder

class MovieRecService(object):

	def __init__(self):
		self.db = MongoClient("localhost").news
		self.RecFinder = rec_finder.RecommendationLoader()

	def runService(self):
		epoch_time = int(time.time())

		# Main loop.
		while True:
			# Find new ratings in database.
			new_ratings = self.db.ratings.find({"timestamp":{"$gte":epoch_time}}, no_cursor_timeout = True)
			print "Found ", new_ratings.count(), " new ratings"
			users_with_updated_ratings = set()
			# Extract users with new ratings.
			for new_rating in new_ratings:
				print new_rating
				print new_rating["user_id"]
				users_with_updated_ratings.add(int(new_rating["user_id"]))

			# Update model.
			self.runMachineLearning(new_ratings)

			self.RecFinder.loadMatrices()
			print "Users with updated ratings: ", users_with_updated_ratings

			# Retrieve updated recommendations.
			for u_id in users_with_updated_ratings:
				print "Updating predicted movies for user with u_id ", u_id
				predicted_ratings, recommended_movie_ids = self.RecFinder.getPredictedRatingsForUser(u_id)

				# Update recommendations in database.
				self.db.recommendations2.update(  
					{ "user_id":u_id} , 
					{ "$set": 
						{"predicted_ratings":predicted_ratings, 
						"recommended_movie_ids":recommended_movie_ids} 
					})

			# Current time in loop.
			epoch_time = int(time.time())
			print "Current epoch time: ", epoch_time
			# Wait for some time in between runs (or don't).
			time.sleep(5)



	def runMachineLearning(self, new_ratings):
		# Feed new ratings (and possibly new users) into your machine learning to generate new model.
		pass


if __name__ == '__main__':
	mrs = MovieRecService()
	mrs.runService()