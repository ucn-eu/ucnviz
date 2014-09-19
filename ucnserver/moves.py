from flask import current_app, Blueprint, render_template, request
from vpnresolve import VPNResolve
import requests

moves_api = Blueprint('moves_api', __name__)

#clicks on this url and is then prompted to enter pin in moves app.
@moves_api.route("/moves", methods=['GET'])
def root():	
	vpnres = VPNResolve(current_app.config["CIDR"], current_app.config["OPENVPN_STATUS"])
	host = vpnres.clientip(request)
	current_app.config["logger"].debug("GET / from %s" % host)
	u =  '%s/authorize?response_type=code' % current_app.config["OAUTH_URL"]
	c = '&client_id=' + current_app.config["CLIENT_ID"]
	s = '&scope=' + 'activity location'
	url = u + c + s
	#return '<a href="' + url + '">click me</a>'
	return render_template('moves.html', url=url)
#user is redirected here with the authcode
@moves_api.route("/moves/callback")
def authcallback():
	vpnres = VPNResolve(current_app.config["CIDR"], current_app.config["OPENVPN_STATUS"])
	host = vpnres.clientip(request)
	current_app.config["logger"].debug("GET /moves/callback from %s" % host)
	code = request.args.get('code')
	#now swap the code for a token?
	c = '&client_id=' +  current_app.config["CLIENT_ID"]
	r = '&redirect_uri=' + current_app.config["REDIRECT_URL"]
	s = '&client_secret=' +  current_app.config["CLIENT_SECRET"]
	j = requests.post(current_app.config["OAUTH_URL"] + '/access_token?grant_type=authorization_code&code=' + code + c + s + r)
	current_app.config["logger"].debug("swapped code for token for host %s" % host)
	token = j.json()['access_token']
	current_app.config["collectdb"].insert_token_for_host(host, token)
	current_app.config["logger"].debug("saved token for host %s" % host)
	return render_template('moves_callback.html')
