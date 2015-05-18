from config import TestingConfig
import sqlite3
import requests

def reconnect(fn):
	""" decorator to reconnect to the database if needed """
	def wrapped(self, *args, **kwargs):
		if self.connected is not True:
			self.connect()
		return fn(self, *args, **kwargs)
	return wrapped

class Classifier( object ):
	''' classdocs '''

	def __init__( self, name):
		self.name = name
		self.connected = False
	#///////////////////////////////////////


	def connect( self ):
		#log.debug( "connecting to sqllite database %s" % self.name )
		if self.connected is False:
			self.conn = sqlite3.connect("%s" % self.name, check_same_thread = False)
			self.connected = True

	@reconnect
	def createTables(self):
		self.conn.execute('''CREATE TABLE IF NOT EXISTS CLASSIFICATION
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			tld CHAR(255),
			classifier CHAR(128),
			success INTEGER,
			error CHAR(255),
			score REAL,
			classification CHAR(255));''')
		self.conn.commit()
	@reconnect
	def fetch_distinct_tlds(self, filters):
		whereclause = "WHERE tld NOT IN (%s) AND tld NOT LIKE '%%openvpn%%'" % ",".join("'{0}'".format(w) for w in filters)
		sql = "SELECT DISTINCT(tld) FROM urls %s" % whereclause
		result = self.conn.execute(sql)
		return [row[0] for row in result]

	@reconnect
	def fetch_classified_tlds(self, classifier):
		sql = "SELECT DISTINCT(tld) FROM CLASSIFICATION WHERE classifier='%s' " % classifier
		result = self.conn.execute(sql)
		classified = {}

		for row in result:
			classified[row[0]] = True

		return classified

	def classify_urls_with_alchemy(self, tlds, apikey):

		alreadyclassified = self.fetch_classified_tlds("alchemy")
		limitexceeded = False

		for tld in tlds:

			if limitexceeded:
				return

			if tld not in alreadyclassified:

				payload = {
							'url':tld,
							'outputMode': 'json',
							'apikey':apikey,
						  }
				url = "http://access.alchemyapi.com/calls/url/URLGetRankedTaxonomy"
				r =  requests.get(url, params=payload)
				try:
					result = r.json()
					print "url %s status %s" % (tld,result['status'])

					if result['status'] == "OK":
						maxscore = 0
						label = None
   						print result['taxonomy']
						for classification in result['taxonomy']:
							score = classification["score"]

							if score > maxscore:
								maxscore = score
								label = classification["label"]

						if label is not None:
							self.classify(tld=tld, success=True, classifier="alchemy", classification=label, error=None, score=maxscore)
						else:
							self.classify(tld=tld, success=False, classifier="alchemy", classification=None, error="no classification")

					elif result['status'] == "ERROR":

						if result['statusInfo'] == "daily-transaction-limit-exceeded":
							print "limit exceeded"
							limitexceeded = True
						else:
							self.classify(tld=tld, success=False, classifier="alchemy", classification=None, error=result['statusInfo'])

					#print result
				except:
					print "oh well - error!"

	@reconnect
	def classify(self, tld, success, classifier, classification, error=None, score=None):

		if success is True:
			try:
				sql = 'INSERT INTO CLASSIFICATION(tld,success,classifier,score,classification) VALUES ("%s",%d,"%s",%f,"%s")' % (tld, 1, classifier, float(score), classification)
				print sql
				result = self.conn.execute(sql)
				self.conn.commit()
			except Exception, e:
				print "error storing in database"
				print e

		else:
			try:
				sql = "INSERT INTO CLASSIFICATION(tld,success,classifier,error) VALUES ('%s',%d,'%s','%s')" % (tld, 0, classifier, error)
				print sql
				self.conn.execute(sql)
				self.conn.commit()
			except Exception, e:
				print "error storing in database"
				print e

if __name__ == "__main__":
	cfg = TestingConfig()
	print "using dbase %s" % cfg.DATADB
	classifier = Classifier(name=cfg.DATADB)
	classifier.createTables();
	blocked = []
	with open("ad_domains.txt") as f:
		blocked = [x.strip() for x in f.readlines()]

	toclassify = classifier.fetch_distinct_tlds(blocked)
	classifier.classify_urls_with_alchemy(toclassify,cfg.ALCHEMYAPI)
