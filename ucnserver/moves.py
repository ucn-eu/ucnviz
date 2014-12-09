from flask import current_app, Blueprint, render_template, request, redirect
from vpnresolve import VPNResolve
import requests
import logging
import json
import urllib
from bson.objectid import ObjectId

moves_api = Blueprint('moves_api', __name__)
logger = logging.getLogger( "ucn_logger" )

#clicks on this url and is then prompted to enter pin in moves app.
@moves_api.route("/viz/moves", methods=['GET'])
@moves_api.route("/viz/moves/", methods=['GET'])
def root():	

	
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


	#myuser = db[current_app.config["USERCOLLECTION"]].find_one({"_id": ObjectId(user['passport']['user'])})
	
	vpnres = VPNResolve(current_app.config["CIDR"], {"db":current_app.config["MONGODB"],"collection":current_app.config["VPNLOGSCOLLECTION"],"host":current_app.config["MONGOHOST"], "port":current_app.config["MONGOPORT"]})
	
	host = vpnres.clientip(request)
	
	if host is None:
		return render_template('vpn_connect.html')
		
	logger.debug("GET / from %s" % host)
	u =  '%s/authorize?response_type=code' % current_app.config["OAUTH_URL"]
	c = '&client_id=' + current_app.config["CLIENT_ID"]
	s = '&scope=' + 'activity location'
	r = '&redirect_uri=%s/%s?device=%s' % (current_app.config["BASEURL"], current_app.config["REDIRECT_URL"], host)
	url = u + c + s + r
	return render_template('moves.html', url=url)

#user is redirected here with the authcode
@moves_api.route("/viz/moves/callback")
def authcallback():
	host = request.args.get('device')
	
	#vpnres = VPNResolve(current_app.config["CIDR"], {"db":current_app.config["MONGODB"],"collection":current_app.config["VPNLOGSCOLLECTION"],"host":current_app.config["MONGOHOST"], "port":current_app.config["MONGOPORT"]})
	#host = vpnres.clientip(request)
	
	logger.debug("GET /viz/moves/callback from %s" % host)
	code = request.args.get('code')
	#now swap the code for a token?
	c = '&client_id=' +  current_app.config["CLIENT_ID"]
	r = '&redirect_uri=%s/%s?device=%s' % (current_app.config["BASEURL"], current_app.config["REDIRECT_URL"], host)
	s = '&client_secret=' +  current_app.config["CLIENT_SECRET"]
	j = requests.post(current_app.config["OAUTH_URL"] + '/access_token?grant_type=authorization_code&code=' + code + c + s + r)
	
	logger.debug("swapped code for token for host %s" % host)
	token = j.json()['access_token']
	
	current_app.config["collectdb"].insert_token_for_host('moves',host, token)
	logger.debug("saved token for host %s" % host)
	return render_template('moves_callback.html')
