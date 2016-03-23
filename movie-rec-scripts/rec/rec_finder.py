from pymongo import MongoClient

class RecommendationLoader (object):

	def __init__(self):
		self.db = MongoClient("localhost").news
		self.loadMatrices()

	def loadMatrices(self):
		self.m_dict = {}
		self.u_dict = {}
		for l in open('model', 'r').readlines():
			getid = l.split()[0][0]
			id_  = int(l.split()[0].strip('p').strip('q'))
			vec =  map(float,l.split()[2:11])

			if getid == 'p':
				self.u_dict[id_] = vec
			if getid == 'q':
				self.m_dict[id_] = vec

	def calculate_rating(self, u_id, m_id):
		return sum(p*q for p,q in zip(self.m_dict[m_id], self.u_dict[u_id]))


	def getPredictedRatingsForUser(self, u_id):
		predicted_ratings = []
		for m_id in range(1, 65134):
			pred = self.calculate_rating(u_id, m_id)
			if pred > 0:
				predicted_ratings.append((m_id, pred))

		if not predicted_ratings:
				return []

		print len(predicted_ratings)
		predicted_ratings.sort(key = lambda x : x[1], reverse = True)
		print "predicted_ratings combined: ", predicted_ratings[:10]
		recommended_movie_ids, predicted_ratings = zip(*predicted_ratings)
		print "predicted_ratings: ", predicted_ratings[:10]
		print "movie_ids: ", recommended_movie_ids[:10]

		return predicted_ratings, recommended_movie_ids


	def loadRecommendations(self):
		for u_id in range(1, 1001):


			recommendations= self.getPredictedRatingsForUser(u_id)
			if not recommendations:
				continue
			predicted_ratings, recommended_movie_ids = recommendations
			self.db.recommendations.insert({"user_id":str(u_id), "recommended_movie_ids":recommended_movie_ids,
				"predicted_ratings": predicted_ratings})

		self.db.recommendations.create_index("user_id")



if __name__ == '__main__':
	rl = RecommendationLoader()
	rl.loadRecommendations()
