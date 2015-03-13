from flask import current_app, Blueprint, render_template, request, redirect,jsonify
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

	login = request.args.get('login')

	
	if 'connect.sid' not in request.cookies:
			return redirect("%s/ucn/auth/login" % current_app.config["BASEURL"])

	cookie = urllib.unquote(request.cookies['connect.sid'])
	sessionid = "sess:%s" % cookie[2:].split(".")[0]
	
	user = json.loads(current_app.config["redis"].get(sessionid))

	if "passport" not in user:
		return redirect("%s/ucn/auth/login" %  current_app.config["BASEURL"])
		
	if "user" not in user['passport']:
		return redirect("%s/ucn/auth/login" %  current_app.config["BASEURL"])
	
	db = current_app.config["mongoclient"][current_app.config["MONGODB"]]
	
	#vpnres = VPNResolve(current_app.config["CIDR"], {"db":current_app.config["MONGODB"],"logscollection":current_app.config["VPNLOGSCOLLECTION"],"devicecollection":current_app.config["DEVICECOLLECTION"],"host":current_app.config["MONGOHOST"], "port":current_app.config["MONGOPORT"]})
	
	#host = vpnres.clientip(request)
	
	#if host is None:
	#	return render_template('vpn_connect.html')
		
	flow = client.flow_from_clientsecrets(
		'client_secrets.json',
		scope='https://www.googleapis.com/auth/calendar',
		redirect_uri='%s%s' % (current_app.config["BASEURL"],current_app.config["CALENDAR_REDIRECT_URL"])
	)	
	flow.params['state'] = login
	
	auth_uri = flow.step1_get_authorize_url()
	return render_template('calendar.html', url=auth_uri)

@calendar_api.route("/viz/calendar/callback")	
def gcallback():

	login = request.args.get('state')
	
	#vpnres = VPNResolve(current_app.config["CIDR"], {"db":current_app.config["MONGODB"],"logscollection":current_app.config["VPNLOGSCOLLECTION"],"devicecollection":current_app.config["DEVICECOLLECTION"],"host":current_app.config["MONGOHOST"], "port":current_app.config["MONGOPORT"]})
	#host = vpnres.clientip(request)
	
	#if host is None:
	#	return render_template('vpn_connect.html')
	
	flow = client.flow_from_clientsecrets(
		'client_secrets.json',
		scope='https://www.googleapis.com/auth/calendar',
		redirect_uri='%s%s' % (current_app.config["BASEURL"],current_app.config["CALENDAR_REDIRECT_URL"])
	)
	auth_code = request.args.get('code')
	credentials = flow.step2_exchange(auth_code)
	
	try:
		
		token = credentials.to_json()
		
		logger.debug("calendar token exch %s %s " % (login, token))
		db = current_app.config["mongoclient"][current_app.config["MONGODB"]]
		user = db[current_app.config["USERCOLLECTION"]].find_one({"username":login})
	
		if user is not None:
			current_app.config["collectdb"].insert_calendar_token_for_user(login, token)
			logger.debug("calendar: saved calendar token for user %s" % (login))
		else:
			logger.debug("calendar: failed to lookup user for %s" % login)
			return jsonify({"success":False})
			
		return jsonify({"success":True})
	except:
		logger.debug("calendar: failed to save token for user %s" % login)
		return jsonify({"success":False})
