from flask import current_app, Blueprint, render_template, jsonify, request, redirect
import json
import time
import logging
import urllib
import redis
import sys
from pymongo import MongoClient
from bson.objectid import ObjectId
from functools import wraps

logger = logging.getLogger( "ucn_logger" )

viz_api = Blueprint('viz_api', __name__)


def loggedin(fn):
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
	
		return fn(*args, **kwargs)
	
	return wrapped

def hostsforuser():
	cookie = urllib.unquote(request.cookies['connect.sid'])
	sessionid = "sess:%s" % cookie[2:].split(".")[0]
	user = json.loads(current_app.config["redis"].get(sessionid))
	db = current_app.config["mongoclient"][current_app.config["MONGODB"]]
	myuser = db[current_app.config["USERCOLLECTION"]].find_one({"_id": ObjectId(user['passport']['user'])})
	hosts = {}
	for device in db[current_app.config["DEVICECOLLECTION"]].find({"username":myuser['username']}):
		hosts[device['vpn_udp_ip']] = {'name':device['login'], 'type':device['type']}
		hosts[device['vpn_tcp_ip']] = {'name':device['login'], 'type':device['type']}
		
	#hosts = [device['vpn_udp_ip'] for device in db[current_app.config["DEVICECOLLECTION"]].find({"username":myuser['username']})]
	
	return hosts
		
@viz_api.route("/web")
@loggedin
def web():
	return render_template('browsing.html')

@viz_api.route("/web/logout")
def logout():
	if 'connect.sid' not in request.cookies:
			return redirect("%s/ucn" % current_app.config["BASEURL"])
	
	cookie = urllib.unquote(request.cookies['connect.sid'])
	
	sessionid = "sess:%s" % cookie[2:].split(".")[0]
	current_app.config["redis"].delete(sessionid)	
	return redirect("%s/ucn/auth/login" %  current_app.config["BASEURL"])
	
	
@viz_api.route("/devices")
def devices():
	return render_template('devices.html')
	
#fetch time binned activity data from fromts to tots for all devices in home
#defaults to the last 24 hours

def defaulttimerange(hosts):
	tots 	= current_app.config["datadb"].fetch_latest_ts_for_hosts(hosts)
 	if tots is None:
 		None
 	fromts 	= tots - 7 * 24*60*60
	return {'fromts':fromts,'tots':tots}
	
@viz_api.route("/overview/activity")
def overview():
	hosts   = hostsforuser().keys()
	devices = hostsforuser()
	bin 	= request.args.get('bin') or None
	fromts  = request.args.get('fromts') or None
 	tots    = request.args.get('tots') or None
 	
 	activitybins = []
 	
 	if fromts is not None:
 		fromts = int(fromts)
 		
 	if tots is not None:
 		tots = int(tots)
 		
 	#if time range is not provided, set it to the last 24 hours of recorded data
 	if tots is None or fromts is None:
 		tr = defaulttimerange(hosts)
 		if tr is None:
 			return jsonify({"keys":[], "hosts":[]})
 		else:
 			fromts = tr['fromts']
 			tots = tr['tots']	
 		
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
		
#return all devices that have associated phone data (i.e running processes data)
@viz_api.route("/devices/hosts")
@viz_api.route("/admin/devices/hosts")
def devicehosts():
	hosts = current_app.config["datadb"].fetch_device_hosts()
	return jsonify(hosts=hosts)

@viz_api.route("/devices/processes")
@viz_api.route("/admin/devices/processes")
def processes():
	host = request.args.get('host')
	filter = request.args.get('filtered')
	#current_app.config["datadb"].connect()
	processes = current_app.config["datadb"].fetch_device_processes(host)
	minmax	  = current_app.config["datadb"].fetch_min_max_processes(host)
		
	if filter == "true":
	 	filtered = []
		for process in processes:
			if process not in current_app.config["background"]:
				filtered.append(process)
		return jsonify(processes=filtered)
				
	return jsonify(processes=processes, min=minmax[0], max=minmax[1])

@viz_api.route("/devices/process")
@viz_api.route("/admin/devices/process")
def process():
	processname = request.args.get('process')
	host = request.args.get('host')
	details = current_app.config["datadb"].fetch_details_for_process(host, processname)
	max = current_app.config["datadb"].fetch_device_max_process_ts(host)
	return jsonify(details=details, max=max)

@viz_api.route("/devices/netdata")
@viz_api.route("/admin/devices/netdata")
def netdata():
	host 	= request.args.get('host')
	netdata =  current_app.config["datadb"].fetch_netdata_for_host(host)
	return jsonify(netdata=netdata)
	
@viz_api.route("/web/browsing")
def browsing():
 	host = request.args.get('host')
 	fromts = request.args.get('fromts')
 	tots   = request.args.get('tots')
	traffic = current_app.config["datadb"].fetch_urls_for_host(host=host, fromts=fromts, tots=tots, filters=current_app.config["blocked"])
	return jsonify(traffic=traffic)
	
@viz_api.route("/web/queries")
@viz_api.route("/admin/web/queries")
def queries():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
	tots   	= request.args.get('tots') or None
	queries = current_app.config["datadb"].fetch_queries_for_host(host,fromts, tots)
	return jsonify(queries=queries)

@viz_api.route("/web/summary")
@viz_api.route("/admin/web/summary")
def summary():
	host 	= request.args.get('host')
	bin 	= request.args.get('bin')
	fromts 	= request.args.get('fromts') or None
 	tots   	= request.args.get('tots') or None
 
 	if fromts is not None:
 		fromts = int(fromts)
 		
 	if tots is not None:
 		tots = int(tots)
 		
  	if tots is None or fromts is None:
 		tots 	= current_app.config["datadb"].fetch_latest_ts_for_host(host)
 		fromts 	= tots - 1.5 * 24*60*60
 	
 	# return data binned by day if no range supplied, else hourly 
 	# (would be better to default to calc based on requested range...)
 	
 	if bin is not None:	
 		bin = int(bin)
 	else:
 		bin = 60*60	
 	
	#current_app.config["datadb"].connect()
	#fetch a day by day summary of browsing
	summary = current_app.config["datadb"].fetch_timebins_for_host(bin,host,fromts, tots, filters=current_app.config["blocked"])
	zones	= current_app.config["datadb"].fetch_zones_for_host(host,fromts, tots)
	apps	= current_app.config["datadb"].fetch_apps_for_host(host,fromts, tots)
	
	return jsonify(summary=summary, zones=zones, apps=apps)

@viz_api.route("/web/bootstrap")
def hosts():
	hosts = hostsforuser().keys()
	return jsonify(hosts=hosts)

@viz_api.route("/web/domainsummary")
@viz_api.route("/admin/web/domainsummary")
def domainsummary():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots	= request.args.get('tots') or None
	domain 	= request.args.get('domain')
	#current_app.config["datadb"].connect()
	requests = current_app.config["datadb"].fetch_domain_requests_for_host(host,domain,fromts, tots)
	zones	 = current_app.config["datadb"].fetch_zones_for_host(host,fromts, tots)
	return jsonify(requests=requests, zones=zones)

@viz_api.route("/tag/urlsfortagging")
@viz_api.route("/admin/tag/urlsfortagging")
def urlsfortagging():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots	= request.args.get('tots') or None
 	#current_app.config["datadb"].connect()
 
	urls = current_app.config["datadb"].fetch_urls_for_tagging(host, fromts, tots, filters=current_app.config["blocked"])
	return jsonify(urls=urls)

@viz_api.route("/tag/urlsfortag")
@viz_api.route("/admin/tag/urlsfortag")
def urlsfortag():
	host 	= request.args.get('host')
	tag		= request.args.get('tag')
	#current_app.config["datadb"].connect()
	urls = current_app.config["datadb"].fetch_urls_for_tag(host, tag)
	return jsonify(urls=urls)
	
@viz_api.route("/tag/tagurls")
@viz_api.route("/admin/tag/tagurls")
def tagurls():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	fromts 	= request.args.get('fromts') or 0
 	tots	= request.args.get('tots') or 99999999999

	domains = request.args.getlist('domains[]')
	for tld in domains:
		current_app.config["datadb"].insert_tag_for_host(host,tld,tag,fromts,tots)
		
	return jsonify(success=True)

@viz_api.route("/tag/add")
@viz_api.route("/admin/tag/add")
def addtag():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	result = current_app.config["datadb"].insert_tag(tag, host)
	return jsonify(success=result)

@viz_api.route("/tag/removetag")
@viz_api.route("/admin/tag/removetag")
def removetag():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	current_app.config["datadb"].remove_tag_for_host(host,tag)
	return jsonify(success=True)


@viz_api.route("/tag/removeassociation")
@viz_api.route("/admin/tag/removeassociation")
def removeassociation():
	host = request.args.get('host')
	domain	 = request.args.get('domain')
	tag	= request.args.get('tag')
	
	current_app.config["datadb"].remove_tag_association_for_host(host,domain,tag)
	return jsonify(success=True)

@viz_api.route("/tag/activity")
@viz_api.route("/admin/tag/activity")
def activity():
	host 	= request.args.get('host') or None
	fromts 	= request.args.get('fromts') or None
	tots	= request.args.get('tots') or None
	
	if host is None:
		return jsonify(activity=[], tags=[])

	if fromts is None or tots is None:
		tr = defaulttimerange([host])
		if tr is None:
			return jsonify(activity=[], tags=[])
		fromts = tr['fromts']
		tots   = tr['tots']
		
	#current_app.config["datadb"].connect()
	activity = current_app.config["datadb"].fetch_tagged_for_host(host,fromts,tots)
	tags  = current_app.config["datadb"].fetch_tags_for_host(host)
	return jsonify(activity=activity, tags=tags)

 