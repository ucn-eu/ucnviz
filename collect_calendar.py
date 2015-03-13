import requests
from config import TestingConfig
import json
import logging
from collectdb import CollectDB
from datadb import NetDB
import time
from oauth2client import client

from apiclient.discovery import build
import httplib2

from datetime import datetime
import dateutil.parser


logger = logging.getLogger( "collect_logger" )

def fetchevents():
	
	tokens = collectdb.fetch_calendar_tokens()
	
	for token in tokens:
		credentials = client.OAuth2Credentials.from_json(token['token'])
		http = httplib2.Http()
   		http = credentials.authorize(http)
		service = build('calendar', 'v3', http=http)
		
		try:
			if token['attr'] is None:	
				request = service.calendarList().list()
				while request != None:
					response = request.execute()
					for clist in response.get('items', []):
						if clist.get("summary") == 'ucn':
							token['attr'] = clist.get("id")
							collectdb.update_calendar_id(token['username'], token['attr'])
							break
					request =  service.calendarList().list_next(request, response)
			
		 	request = service.events().list(calendarId=token['attr'])
			while request != None:
			  # Get the next page.
			  response = request.execute()
			
			  for event in response.get('items', []):
			  	start = int(time.mktime(dateutil.parser.parse(event.get("start")['dateTime']).timetuple()))
				end  = int(time.mktime(dateutil.parser.parse(event.get("end")['dateTime']).timetuple()))
			  	noteid = datadb.insert_calendar_entry(event.get("summary"),token['username'],start,end)
			  # Get the next request object by passing the previous request object to
			  # the list_next method.
			  request = service.events().list_next(request, response)

  		except client.AccessTokenRefreshError:
			logger.error('The credentials have been revoked or expired for %s' % token)
	


if __name__ == "__main__":
	cfg = TestingConfig()
	hdlr = logging.FileHandler(cfg.COLLECT_LOGFILE or '/var/tmp/collect.log') 
	formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
	hdlr.setFormatter(formatter)
	logger.addHandler(hdlr)
	logger.setLevel(logging.DEBUG)

	collectdb = CollectDB(name=cfg.COLLECTDB)
	datadb = NetDB(name=cfg.DATADB)
	fetchevents()
