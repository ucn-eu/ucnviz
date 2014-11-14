from flask import current_app, Blueprint, render_template, request, redirect,jsonify
import logging
import urllib
import json
import redis
import viz
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.code import Code
from functools import wraps

admin_api = Blueprint('admin_api', __name__)
logger = logging.getLogger( "ucn_logger" )

def adminloggedin(fn):
	@wraps(fn)
	def wrapped(*args, **kwargs):
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

		myuser = db[current_app.config["USERCOLLECTION"]].find_one({"_id": ObjectId(user['passport']['user'])})
		print myuser
		
		if myuser is None:
			return redirect("%s/ucn/auth/login" %  current_app.config["BASEURL"])
		if myuser['isadmin'] is False:
			return redirect("%s/web" % current_app.config["BASEURL"])
			
		return fn(*args, **kwargs)
	
	return wrapped

@admin_api.route("/viz/admin", methods=['GET'])
@adminloggedin
def admin():	

	db = current_app.config["mongoclient"][current_app.config["MONGODB"]]

	families = db[current_app.config["USERCOLLECTION"]].distinct('familyname')
	
	familylist = []
	
	for family in families:
		users = []
		devices = []
		usernames = db[current_app.config["USERCOLLECTION"]].find({"familyname":family})
		for user in usernames:
			users.append(user['username'])
			dresult = db[current_app.config["DEVICECOLLECTION"]].find({"username":user['username']})
			for device in dresult:
				devices.append(device['vpn_udp_ip'])
		familylist.append({'name':family, 'devices':devices, 'users':users})	
			
	return render_template('admin.html', families=familylist)
	

@admin_api.route("/viz/admin/web", methods=['GET'])
@adminloggedin
def adminoverview():	
	family = request.args.get('family') or None
	return render_template('browsing.html', family=family)
	
@admin_api.route("/viz/admin/overview/activity", methods=['GET'])
@adminloggedin
def overview():
	family  = request.args.get('family') or None
	bin 	= request.args.get('bin') or None
	fromts  = request.args.get('fromts') or None
 	tots    = request.args.get('tots') or None
 	
  	devices  =  hostsforfamily(family)
 	hosts	 = devices.keys()
 	
 	activitybins = []
 	
 	if fromts is not None:
 		fromts = int(fromts)
 		
 	if tots is not None:
 		tots = int(tots)
 		
 	#if time range is not provided, set it to the last 24 hours of recorded data
 	if tots is None or fromts is None:
 		tots 	= current_app.config["datadb"].fetch_latest_ts_for_hosts(hosts)
 		if tots is None:
 			return jsonify({"keys":[], "hosts":[]})
 			
 		fromts 	= tots - 7 * 24*60*60
 		
 	if bin is not None:
 		bin = int(bin)
 	else:
 		#set bin to hourly
 		bin = 60 * 60
 
	zones  = current_app.config["datadb"].fetch_zones_for_hosts(hosts,fromts, tots)
	apps   = current_app.config["datadb"].fetch_apps_for_hosts(hosts,fromts, tots)
	values = current_app.config["datadb"].fetchtimebins_for_hosts(bin,hosts,fromts, tots)
	tags  = current_app.config["datadb"].fetch_tagged_for_hosts(hosts,fromts,tots)
	
	values['zones'] = zones
	values['apps'] = apps
	values['devices'] = devices
	values['tags'] = tags
	
	return jsonify(values)


@admin_api.route("/viz/admin/web/bootstrap")
@adminloggedin
def hosts():
	family = request.args.get('familiy') or None
	hosts = hostsforfamily(family).keys()
	return jsonify(hosts=hosts)


#-------- non admin dependent routes, so pass through to standard user routes ------------#

#@admin_api.route("/admin/tag/urlsfortagging")
#def urlsfortagging():
#	return viz.urlsfortagging();

#@admin_api.route("/admin/tag/activity")
#def activity():
#	return viz.activity();

#@admin_api.route("/admin/web/queries")
#def queries():
#	return viz.queries();


	
def hostsforfamily(family):
	db = current_app.config["mongoclient"][current_app.config["MONGODB"]]
	devices = {}
	usernames = db[current_app.config["USERCOLLECTION"]].find({"familyname":family})
	for user in usernames:
		dresult = db[current_app.config["DEVICECOLLECTION"]].find({"username":user['username']})
		for device in dresult:
			devices[device['vpn_udp_ip']] = {'name':device['login'], 'type':device['type']}
			devices[device['vpn_tcp_ip']] = {'name':device['login'], 'type':device['type']}
			#devices.append(device['vpn_udp_ip'])
			
	return devices