from flask import current_app, Blueprint, render_template, request, redirect,jsonify
import logging
import urllib
import json
import redis
import viz
import time
import math
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

@admin_api.route("/viz/admin/calendarentries", methods=['GET'])
@adminloggedin
def calendarentries():
	username  	= request.args.get('username') or None
	entries = current_app.config["datadb"].fetch_calendar_entries_for_username(username)
	if entries is not None:
		return render_template("calendarentries.html", entries=entries)
	else:
		return ""

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

 	tstart = time.time()
 	raw = current_app.config["datadb"].fetch_browsing_for_hosts(hosts,fromts, tots, current_app.config["blocked"])
 	values = _binned(bin, raw['mints'], raw['maxts'], raw['results'])
	zones  = current_app.config["datadb"].fetch_zones_for_hosts(hosts,fromts, tots)
	apps   = current_app.config["datadb"].fetch_apps_for_hosts(hosts,fromts, tots)
	#t2 = time.time()
	#values = current_app.config["datadb"].fetch_timebins_for_hosts(bin,hosts,fromts,tots)
	tags   = current_app.config["datadb"].fetch_tagged_for_hosts(hosts,fromts,tots)
	notes  = current_app.config["datadb"].fetch_notes_for_hosts(hosts,fromts,tots)
	tend = time.time()

	if values is not None:
		values['zones'] = zones
		values['apps'] = apps
		values['devices'] = devices
		values['tags'] = tags
		values['notes'] = notes
		values['raw'] = raw
		return jsonify(values)
	else:
		return jsonify({})


@admin_api.route("/viz/admin/web/bootstrap")
@adminloggedin
def hosts():
	family = request.args.get('family') or None
	hosts = hostsforfamily(family).keys()
	return jsonify(hosts=hosts)


def binlabel(binsize, ts):
	return int(math.floor(ts/binsize)*binsize)

def _binned(binsize, mints, maxts, result):

	if len(result) <= 0:
		return

	hosts = {}
	seen = {} #for filtering out duplicate tlds within timebin
	ts = mints
	keys = []
	indexes = {}

	c = 0

	while ts < maxts+binsize:
		keys.append(binlabel(binsize, ts))
		indexes[binlabel(binsize, ts)] = c
		c = c + 1
		ts = ts + binsize

	for row in result:
		host = row[2]
		ts   = row[0]
		idx = indexes[binlabel(binsize, ts)]
		if host not in hosts:
			hosts[host] = [0]*len(keys)
			seen[host] = {}
			seen[host][idx] = [row[1]]
			hosts[host][idx] = hosts[host][idx] + 1
		else:
			if idx not in seen[host]:
				seen[host][idx] = []
			if row[1] not in seen[host][idx]:
				seen[host][idx].append(row[1])
				hosts[host][idx] = hosts[host][idx] + 1

	return {"keys":keys, "hosts":hosts}


def hostsforfamily(family):
	db = current_app.config["mongoclient"][current_app.config["MONGODB"]]
	devices = {}
	usernames = db[current_app.config["USERCOLLECTION"]].find({"familyname":family})
	for user in usernames:
		dresult = db[current_app.config["DEVICECOLLECTION"]].find({"username":user['username']})
		for device in dresult:
			#devices[device['vpn_udp_ip']] = {'name':device['login'], 'type':device['type']}
			devices[device['vpn_tcp_ip']] = {'name':device['login'], 'type':device['type']}
			#devices.append(device['vpn_udp_ip'])

	return devices
