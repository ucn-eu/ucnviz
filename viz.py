from flask import Flask, render_template, jsonify, request
import json
from database import NetDB
import time

app = Flask(__name__)

@app.route("/web")
def web():
	return render_template('browsing.html')

@app.route("/devices")
def devices():
	return render_template('devices.html')
	
@app.route("/")
def root():
	return render_template('overview.html')


#fetch time binned activity data from fromts to tots for all devices in home
#defaults to the last 24 hours

@app.route("/overview/activity")
def overview():
	home = request.args.get('home') or "lodges"
	bin 	= request.args.get('bin') or None
	fromts = request.args.get('fromts') or None
 	tots   = request.args.get('tots') or None
 	netDB.connect()
 	#hosts = netDB.fetch_hosts_for_home(home)	
 	
 	activitybins = []
 	
 	if fromts is not None:
 		fromts = int(fromts)
 		
 	if tots is not None:
 		tots = int(tots)
 		
 	#if time range is not provided, set it to the last 24 hours of recorded data
 	if tots is None or fromts is None:
 		tots 	= netDB.fetch_latest_ts_for_home(home)
 		fromts 	= tots - 4 * 24*60*60
 		
 	if bin is not None:
 		bin = int(bin)
 	else:
 		#set bin to hourly
 		bin = 60 * 60
 	
 	#might be quicker to do a single sql select on home?  each call to fetch_timebins_for_host  takes approx 0.15s!
	
	values = netDB.fetchtimebins_for_home(bin,home,fromts, tots)

	return jsonify(values)
		
#return all devices that have associated phone data (i.e running processes data)
@app.route("/devices/hosts")
def devicehosts():
	netDB.connect()
	hosts = netDB.fetch_device_hosts()
	return jsonify(hosts=hosts)

@app.route("/devices/processes")
def processes():
	host = request.args.get('host')
	filter = request.args.get('filtered')
	netDB.connect()
	processes = netDB.fetch_device_processes(host)
	minmax	  = netDB.fetch_min_max_processes(host)
		
	if filter == "true":
	 	filtered = []
		for process in processes:
			if process not in background:
				filtered.append(process)
		return jsonify(processes=filtered)
				
	return jsonify(processes=processes, min=minmax[0], max=minmax[1])

@app.route("/devices/process")
def process():
	processname = request.args.get('process')
	host = request.args.get('host')
	netDB.connect()
	details = netDB.fetch_details_for_process(host, processname)
	max = netDB.fetch_device_max_process_ts(host)
	return jsonify(details=details, max=max)

@app.route("/devices/netdata")
def netdata():
	host 	= request.args.get('host')
	netDB.connect()
	netdata =  netDB.fetch_netdata_for_host(host)
	return jsonify(netdata=netdata)
	
@app.route("/web/browsing")
def browsing():
 	host = request.args.get('host')
 	fromts = request.args.get('fromts')
 	tots   = request.args.get('tots')
 	netDB.connect()
	traffic = netDB.fetch_urls_for_host(host=host, fromts=fromts, tots=tots, filters=blocked)
	return jsonify(traffic=traffic)
	
@app.route("/web/queries")
def queries():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
	tots   	= request.args.get('tots') or None
	queries = netDB.fetch_queries_for_host(host,fromts, tots)
	return jsonify(queries=queries)

@app.route("/web/summary")
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
 		tots 	= netDB.fetch_latest_ts_for_host(host)
 		fromts 	= tots - 1.5 * 24*60*60
 	
 	
 	
 	# return data binned by day if no range supplied, else hourly 
 	# (would be better to default to calc based on requested range...)
 	
 	if bin is not None:	
 		bin = int(bin)
 	else:
 		bin = 60*60	
 	
	netDB.connect()
	#fetch a day by day summary of browsing
	summary = netDB.fetch_timebins_for_host(bin,host,fromts, tots, filters=blocked)
	zones	= netDB.fetch_zones_for_host(host,fromts, tots)
	#top		= netDB.fetch_top_urls_for_host(host, 20, fromts, tots)
	#queries = netDB.fetch_queries_for_host(host,fromts, tots)
	return jsonify(summary=summary, zones=zones)
	#, top=top, queries=queries)

@app.route("/web/bootstrap")
def hosts():
	netDB.connect()
	hosts = netDB.fetch_hosts("192.168.8")
	tags  = netDB.fetch_tags()
	return jsonify(hosts=hosts, tags=tags)
	
@app.route("/web/domainsummary")
def domainsummary():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots	= request.args.get('tots') or None
	domain 	= request.args.get('domain')
	netDB.connect()
	requests = netDB.fetch_domain_requests_for_host(host,domain,fromts, tots)
	zones	 = netDB.fetch_zones_for_host(host,fromts, tots)
	return jsonify(requests=requests, zones=zones)

@app.route("/tag/urlsfortagging")
def urlsfortagging():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots	= request.args.get('tots') or None
 	netDB.connect()
	urls = netDB.fetch_urls_for_tagging(host, fromts, tots, filters=blocked)
	return jsonify(urls=urls)

@app.route("/tag/urlsfortag")
def urlsfortag():
	host 	= request.args.get('host')
	tag		= request.args.get('tag')
	netDB.connect()
	urls = netDB.fetch_urls_for_tag(host, tag)
	return jsonify(urls=urls)
	
@app.route("/tag/tagurls")
def tagurls():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	domains = request.args.getlist('domains[]')
	netDB.connect()
	for domain in domains:
		netDB.insert_tag_for_host(host,domain,tag)
		
	return jsonify(success=True)

@app.route("/tag/add")
def addtag():
	tag	 = request.args.get('tag')
	netDB.connect()
	result = netDB.insert_tag(tag)
	return jsonify(success=result)

@app.route("/tag/remove")
def removetag():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	netDB.connect()
	netDB.remove_tag_for_host(host,tag)
	return jsonify(success=True)

@app.route("/tag/activity")
def activity():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
	tots	= request.args.get('tots') or None
	netDB.connect()
	activity = netDB.fetch_tags_for_host(host,fromts,tots)
	tags  = netDB.fetch_tags()
	return jsonify(activity=activity, tags=tags)

	
if __name__ == "__main__":
	blocked = []
	background = []
	
	with open("ad_domains.txt") as f:
		blocked = [x.strip() for x in f.readlines()]
	
	with open("backgroundapps.txt") as f:
		background = [x.strip() for x in f.readlines()]
		
	netDB = NetDB(name="netdata.db")
	
	app.run(debug=True, host='0.0.0.0')
