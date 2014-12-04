from flask import current_app, Blueprint, render_template, request, redirect
from vpnresolve import VPNResolve
import requests
import logging
import json
import urllib
from bson.objectid import ObjectId
from oauth2client import client

calendar_api = Blueprint('calendar_api', __name__)
logger = logging.getLogger( "ucn_logger" )

#clicks on this url and is then prompted to enter pin in moves app.
@calendar_api.route("/viz/calendar", methods=['GET'])
@calendar_api.route("/viz/calendar/", methods=['GET'])
def start():	
	flow = client.flow_from_clientsecrets(
		'client_secrets.json',
		scope='https://www.googleapis.com/auth/calendar',
		redirect_uri='https://horizab4.memset.net/viz/calendar/callback'
	)	
	auth_uri = flow.step1_get_authorize_url()
	print auth_uri
	return render_template('calendar.html', url=auth_uri)

@calendar_api.route("/viz/calendar/callback")	
def gcallback():
	flow = client.flow_from_clientsecrets(
		'client_secrets.json',
		scope='https://www.googleapis.com/auth/calendar',
		redirect_uri='https://horizab4.memset.net/viz/calendar/callback'
	)
	auth_code = request.args.get('code')
	credentials = flow.step2_exchange(auth_code)
	print credentials.to_json()
	return "nice, thanks!!"
