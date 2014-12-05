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

logger = logging.getLogger( "collect_logger" )

#https://developers.google.com/api-client-library/python/start/get_started#simple
def fetchevents():
	
	tokens = collectdb.fetch_tokens('calendar')
	
	for token in tokens:
		
		credentials = client.OAuth2Credentials.from_json(token['token'])
		http = httplib2.Http()
   		http = credentials.authorize(http)
		service = build('calendar', 'v3', http=http)
		try:
			request = service.events().list(calendarId='primary')
   			 # Loop until all pages have been processed.
			while request != None:
			  # Get the next page.
			  response = request.execute()
			
			  for event in response.get('items', []):
				print repr(event.get('summary', 'NO SUMMARY')) + '\n'
			  # Get the next request object by passing the previous request object to
			  # the list_next method.
			  request = service.events().list_next(request, response)

  		except AccessTokenRefreshError:
   			print ('The credentials have been revoked or expired, please re-run the application to re-authorize')
	


if __name__ == "__main__":
	cfg = TestingConfig()
	hdlr = logging.FileHandler(cfg.COLLECT_LOGFILE or '/var/tmp/collect.log') 
	formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
	hdlr.setFormatter(formatter)
	logger.addHandler(hdlr)
	logger.setLevel(logging.DEBUG)

	collectdb = CollectDB(name=cfg.COLLECTDB)
	fetchevents()
