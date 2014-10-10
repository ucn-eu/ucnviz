from flask import current_app, Blueprint, render_template, jsonify, request, redirect
import json
import time
import logging
import urllib
import redis
from pymongo import MongoClient
from bson.objectid import ObjectId

logger = logging.getLogger( "ucn_logger" )

viz_api = Blueprint('viz_api', __name__)

rserver 	= redis.Redis('127.0.0.1')

base_url 	= "https://horizab4.memset.net"
mongohost 	= "127.0.0.1"
mongoport 	= 27017
mongodb 	= "ucnexp"
userc 		= "users"
devicec		= "devices"

mongoc 		= MongoClient(mongohost, mongoport)	

def loggedin(fn):
	""" decorator to check if user is logged in and redirect if not """
	def wrapped(*args, **kwargs):
		if 'connect.sid' not in request.cookies:
			return redirect("%s/ucn" % base_url)

		cookie = urllib.unquote(request.cookies['connect.sid'])
	
		sessionid = "sess:%s" % cookie[2:].split(".")[0]
	
		user = json.loads(rserver.get(sessionid))
	
		if "passport" not in user:
			return redirect("%s/ucn" % base_url)
		
		if "user" not in user['passport']:
			return redirect("%s/ucn" % base_url)
	
		db = mongoc[mongodb]
		myuser = db[userc].find_one({"_id": ObjectId(user['passport']['user'])})

		if myuser is None:
			return redirect("%s/ucn", base_url)
	
		return fn(*args, **kwargs)
	
	return wrapped

def hostsforuser():
	cookie = urllib.unquote(request.cookies['connect.sid'])
	sessionid = "sess:%s" % cookie[2:].split(".")[0]
	user = json.loads(rserver.get(sessionid))
	db = mongoc[mongodb]
	myuser = db[userc].find_one({"_id": ObjectId(user['passport']['user'])})
	
	hosts = [device['vpn_udp_ip'] for device in db[devicec].find({"username":myuser['username']})]
	return hosts
		
@viz_api.route("/web")
@loggedin
def web():
	return render_template('browsing.html')

@viz_api.route("/devices")
def devices():
	return render_template('devices.html')
	
#fetch time binned activity data from fromts to tots for all devices in home
#defaults to the last 24 hours

@viz_api.route("/overview/activity")
def overview():
	hosts = hostsforuser()
	#home = request.args.get('home') or "lodges"
	
	bin 	= request.args.get('bin') or None
	fromts = request.args.get('fromts') or None
 	tots   = request.args.get('tots') or None
 	#current_app.config["datadb"].connect()
 	#hosts = current_app.config["datadb"].fetch_hosts_for_home(home)	
 	
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
	values['zones'] = zones
	values['apps'] = apps
	return jsonify(values)
		
#return all devices that have associated phone data (i.e running processes data)
@viz_api.route("/devices/hosts")
def devicehosts():
	#current_app.config["datadb"].connect()
	hosts = current_app.config["datadb"].fetch_device_hosts()
	return jsonify(hosts=hosts)

@viz_api.route("/devices/processes")
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
def process():
	processname = request.args.get('process')
	host = request.args.get('host')
	#current_app.config["datadb"].connect()
	details = current_app.config["datadb"].fetch_details_for_process(host, processname)
	max = current_app.config["datadb"].fetch_device_max_process_ts(host)
	return jsonify(details=details, max=max)

@viz_api.route("/devices/netdata")
def netdata():
	host 	= request.args.get('host')
	#current_app.config["datadb"].connect()
	netdata =  current_app.config["datadb"].fetch_netdata_for_host(host)
	return jsonify(netdata=netdata)
	
@viz_api.route("/web/browsing")
def browsing():
 	host = request.args.get('host')
 	fromts = request.args.get('fromts')
 	tots   = request.args.get('tots')
 	#current_app.config["datadb"].connect()
	traffic = current_app.config["datadb"].fetch_urls_for_host(host=host, fromts=fromts, tots=tots, filters=current_app.config["blocked"])
	return jsonify(traffic=traffic)
	
@viz_api.route("/web/queries")
def queries():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
	tots   	= request.args.get('tots') or None
	queries = current_app.config["datadb"].fetch_queries_for_host(host,fromts, tots)
	return jsonify(queries=queries)

@viz_api.route("/web/summary")
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
	#home = request.args.get('home') or "lodges"
	hosts = hostsforuser()
	#hosts = current_app.config["datadb"].fetch_hosts_for_home(home)	
	return jsonify(hosts=hosts)

	
@viz_api.route("/web/domainsummary")
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
def urlsfortagging():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots	= request.args.get('tots') or None
 	#current_app.config["datadb"].connect()
	urls = current_app.config["datadb"].fetch_urls_for_tagging(host, fromts, tots, filters=current_app.config["blocked"])
	return jsonify(urls=urls)

@viz_api.route("/tag/urlsfortag")
def urlsfortag():
	host 	= request.args.get('host')
	tag		= request.args.get('tag')
	#current_app.config["datadb"].connect()
	urls = current_app.config["datadb"].fetch_urls_for_tag(host, tag)
	return jsonify(urls=urls)
	
@viz_api.route("/tag/tagurls")
def tagurls():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	domains = request.args.getlist('domains[]')
	for domain in domains:
		current_app.config["datadb"].insert_tag_for_host(host,domain,tag)
		
	return jsonify(success=True)

@viz_api.route("/tag/add")
def addtag():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	result = current_app.config["datadb"].insert_tag(tag, host)
	return jsonify(success=result)

@viz_api.route("/tag/removetag")
def removetag():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	current_app.config["datadb"].remove_tag_for_host(host,tag)
	return jsonify(success=True)


@viz_api.route("/tag/removeassociation")
def removeassociation():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	current_app.config["datadb"].remove_tag_association_for_host(host,tag)
	return jsonify(success=True)

@viz_api.route("/tag/activity")
def activity():
	host 	= request.args.get('host') or None
	fromts 	= request.args.get('fromts') or None
	tots	= request.args.get('tots') or None
	if host is None:
		return jsonify(activity=[], tags=[])

	#current_app.config["datadb"].connect()
	activity = current_app.config["datadb"].fetch_tagged_for_host(host,fromts,tots)
	tags  = current_app.config["datadb"].fetch_tags_for_host(host)
	return jsonify(activity=activity, tags=tags)

 