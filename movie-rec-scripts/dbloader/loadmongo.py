
from pymongo import MongoClient
import pymongo
import csv
class MongoLoader(object):

	def __init__(self):
		self.db = MongoClient("localhost").news

	def load10mMovies(self, inputfile):
		with open(inputfile) as infile:
			batch = []
			for index, line in enumerate(infile.readlines()):
				movie_id, name, genres = line.strip().split("::")
				genres = genres.split("|")
				res = {"movie_id": int(movie_id),
				"name": name,
				"genres": genres}
				batch.append(res)
				if len(batch) > 1000:
					self.db.movies.insert(batch)
					batch = []

			if batch:
				self.db.movies.insert(batch)

        	self.db.movies.create_index("movie_id", unique = True)


	def load10mRatings(self, inputfile):
		with open(inputfile) as infile:
			batch = []
			for index, line in enumerate(infile.readlines()):
				user_id, movie_id, rating, timestamp = line.strip().split("::")

				res = {
				"user_id": user_id,
				"movie_id": int(movie_id),
				"rating": int(2*float(rating)),
				"timestamp": int(timestamp)
				}
				batch.append(res)

				if len(batch) > 1000:
					self.db.ratings.insert(batch)
					batch = []

			if batch:
				self.db.ratings.insert(batch)
			self.db.ratings.create_index([("movie_id", pymongo.ASCENDING), ("user_id", pymongo.ASCENDING)])
			self.db.ratings.create_index("user_id")
			self.db.ratings.create_index("timestamp")

	def addLinks(self, inputfile):
		with open(inputfile) as csvfile:
			reader = csv.DictReader(csvfile)
			for index, line in enumerate(reader):

				res = {"imdb_id":line["imdbId"],
				"movie_id":int(line["movieId"]),
				"tmdb_id":line["tmdbId"]}
				self.db.movies.update(  { "movie_id":res["movie_id"]} , { "$set": {"tmdb_id":res["tmdb_id"], "imdb_id":res["imdb_id"]} })



if __name__ == '__main__':
	ml = MongoLoader()
	base_folder = "/home/ubuntu/golden_movies/data/"
	base_folder = "/Users/dominik/Desktop/golden_movies/data/"
	base_folder = "/Users/archanaiyer/Documents/College/Semester4/reco/movie-rec-project/movie-rec-scripts/dbloader"
	#ml.load10mMovies(base_folder + "/movies.dat")
	#ml.load10mRatings(base_folder + "ml-10M100K/ratings.dat")
	ml.addLinks(base_folder + "/links.csv")
