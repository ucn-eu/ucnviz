import requests
from config import TestingConfig
import json
import logging
from datetime import datetime
from datetime import date
import dateutil.parser
from dateutil.tz import *
from collectdb import CollectDB
from datadb import NetDB
import time

logger = logging.getLogger( "collect_logger" )

#Aggghhh - when using an updated since, there is no way of being able to replace stale records with updated records
#as there is no information in the new records that can be faithfully linked back to the older ones (in the database)
#locationid changes, as does the lng/lat when a location name is changed.  The best we can do is to simply overwrite
#all older data with newer data - and this can only go back 31 days.  It means that, if a location name is changed, only
#the records in the last 31 days will be updated with that change..

def fetchlocations():
	logger.debug("fetching tokens")
	tokens = collectdb.fetch_tokens()
 	
 	for token in tokens:
 		
 		result = None
 		payload = {'access_token':token['token']}
 		url = cfg.API_URL + "/user/places/daily"
 		
 		#if token['lastUpdate'] is not None:
 		#	payload['updatedSince'] = token['lastUpdate']
 		#	now  = int(time.mktime(datetime.now().timetuple()))
 		#	then = int(time.mktime(dateutil.parser.parse(token['lastUpdate']).timetuple()))
 		#	daysElapsed = int((now-then)/(24*60*60))
 			
 		#	if daysElapsed <= 0:
 		#		url = "%s/%s" % (url,datetime.now().strftime("%Y%m%d"))
 		#	else:	
 		#		payload['pastDays'] = 1
 				
 		payload['pastDays'] = 31
		r =  requests.get(url, params=payload)
		logger.debug("called url %s" % r.url)
 		
 		try:
			result = r.json()
		
			latestUpdate = None
			zones = []
		
			for segments in result:
		
					if segments['segments'] is not None:
						for segment in segments['segments']:
							lastUpdate = dateutil.parser.parse(segments['lastUpdate'])
					
							if latestUpdate is None:
								latestUpdate = lastUpdate
							else:
								if time.mktime(lastUpdate.timetuple()) > time.mktime(latestUpdate.timetuple()):
									latestUpdate = lastUpdate
							
							place = segment['place']
							enter = int(time.mktime(dateutil.parser.parse(segment['startTime']).timetuple()))
							exit  = int(time.mktime(dateutil.parser.parse(segment['endTime']).timetuple()))
							if 'name' in place:
								name = place['name']
							else:
								name = ""
						 
							zone = {'date':segments['date'], 'host':token['host'], 'locationid':place['id'], 'name':name, 'lat':place['location']['lat'], 'lng':place['location']['lon'], 'enter':enter, 'exit':exit}
							zones.append(zone)
		
						datadb.remove_zones(token['host'], segments['date'])
						logger.debug("adding zones ")
						#logger.debug(zones)
						datadb.insert_zones(zones)
						zones=[]
		except:
			logger.error("failed to get update for %s %s" % (r.url, token['token']))
						
		if latestUpdate is not None:
			logger.debug("set latest update for host %s to %s" %  (token['host'],lastUpdate.strftime("%Y%m%dT%H%M%S%z")))
			collectdb.update_ts(token['host'], lastUpdate.strftime("%Y%m%dT%H%M%S%z"))
			
	#print result
	#return jsonify({"result":result})
	
if __name__ == "__main__":
	cfg = TestingConfig()
	hdlr = logging.FileHandler(cfg.COLLECT_LOGFILE or '/var/tmp/collect.log') 
	formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
	hdlr.setFormatter(formatter)
	logger.addHandler(hdlr)
	logger.setLevel(logging.DEBUG)

	collectdb = CollectDB(name=cfg.COLLECTDB)
	datadb = NetDB(name=cfg.DATADB)
	fetchlocations()
