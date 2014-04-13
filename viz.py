from flask import Flask, render_template, jsonify, request
import json
from database import NetDB

app = Flask(__name__)

@app.route("/")
def root():
	return render_template('browsing.html')

@app.route("/devices")
def devices():
	return render_template('devices.html')
	
#return all devices that have associated phone data (i.e running processes data)
@app.route("/devicehosts")
def devicehosts():
	netDB.connect()
	hosts = netDB.fetch_device_hosts()
	return jsonify(hosts=hosts)

@app.route("/processes")
def processes():
	host = request.args.get('host')
	netDB.connect()
	processes = netDB.fetch_device_processes(host)
	return jsonify(processes=processes)

@app.route("/process")
def process():
	processname = request.args.get('process')
	host = request.args.get('host')
	netDB.connect()
	details = netDB.fetch_details_for_process(host, processname)
	max = netDB.fetch_device_max_process_ts(host)
	return jsonify(details=details, max=max)
	
@app.route("/browsing")
def browsing():
 	host = request.args.get('host')
 	fromts = request.args.get('fromts')
 	tots   = request.args.get('tots')
 	netDB.connect()
	traffic = netDB.fetch_urls_for_host(host=host, fromts=fromts, tots=tots)
	return jsonify(traffic=traffic)

@app.route("/summary")
def summary():
	host 	= request.args.get('host')
	bin 	= request.args.get('bin')
	fromts 	= request.args.get('fromts') or None
 	tots   	= request.args.get('tots') or None
  	
 	if fromts is not None:
 		fromts = int(fromts)
 		
 	if tots is not None:
 		tots = int(tots)
 	
 	# return data binned by day if no range supplied, else hourly 
 	# (would be better to default to calc based on requested range...)
 	
 	if bin is not None:	
 		bin = int(bin)
 	else:
 		bin = 24*60*60	
 	
	netDB.connect()
	#fetch a day by day summary of browsing
	summary = netDB.fetch_timebins_for_host(bin,host,fromts, tots)
	zones	= netDB.fetch_zones_for_host(host,fromts, tots)
	top		= netDB.fetch_top_urls_for_host(host, 20, fromts, tots)
	queries = netDB.fetch_queries_for_host(host,fromts, tots)
	
	print "queries results are"
	print queries
	return jsonify(summary=summary, zones=zones, top=top, queries=queries)

@app.route("/bootstrap")
def hosts():
	netDB.connect()
	hosts = netDB.fetch_hosts("10.8.0")
	tags  = netDB.fetch_tags()
	return jsonify(hosts=hosts, tags=tags)
	
@app.route("/queries")
def queries():
	
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots   	= request.args.get('tots') or None
 	
 	if fromts is not None:
 		fromts = int(fromts)
 		
 	if tots is not None:
 		tots = int(tots)
 		
	netDB.connect()
	results = netDB.fetch_queries_for_host(host,fromts, tots)
	return jsonify(results=results)
	
@app.route("/zones")
def zones():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots   	= request.args.get('tots') or None
 	
 	if fromts is not None:
 		fromts = int(fromts)
 		
 	if tots is not None:
 		tots = int(tots)
 	
 	netDB.connect()
 	zones = netDB.fetch_zones_for_host(bin,host,fromts, tots)
	return jsonify(zones=zones)

@app.route("/domainsummary")
def domainsummary():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots	= request.args.get('tots') or None
	domain 	= request.args.get('domain')
	netDB.connect()
	requests = netDB.fetch_domain_requests_for_host(host,domain,fromts, tots)
	zones	 = netDB.fetch_zones_for_host(host,fromts, tots)
	return jsonify(requests=requests, zones=zones)

@app.route("/urlsfortagging")
def urlsfortagging():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
 	tots	= request.args.get('tots') or None
	urls = netDB.fetch_urls_for_tagging(host, fromts, tots)
	return jsonify(urls=urls)

@app.route("/tagurls")
def tagurls():
	host = request.args.get('host')
	tag	 = request.args.get('tag')
	domains = request.args.getlist('domains[]')
	netDB.connect()
	for domain in domains:
		netDB.insert_tag_for_host(host,domain,tag)
		
	return jsonify(success=True)

@app.route("/addtag")
def addtag():
	tag	 = request.args.get('tag')
	netDB.connect()
	netDB.insert_tag(tag)
	return jsonify(success=True)
	
@app.route("/activity")
def activity():
	host 	= request.args.get('host')
	fromts 	= request.args.get('fromts') or None
	tots	= request.args.get('tots') or None
	netDB.connect()
	activity = netDB.fetch_tags_for_host(host,fromts,tots)
	tags  = netDB.fetch_tags()
	return jsonify(activity=activity, tags=tags)

@app.route("/netdata")
def netdata():
	host 	= request.args.get('host')
	netDB.connect()
	netdata =  netDB.fetch_netdata_for_host(host)
	return jsonify(netdata=netdata)
	
@app.route("/range")
def range():
	host = request.args.get('host')
 	netDB.connect()
 	range = netDB.fetch_range_for_host(host)
	return jsonify(range=range)
	
@app.route("/locationdata")
def location_data():
	data=[{"Key":"sensor1","DateTime":"2013-09-04T09:25:00+10:00","Lat":-33.697746,"Long":150.948976,"Heading":142.0,"Speed":3},{"Key":"sensor1","DateTime":"2013-09-04T09:25:11+10:00","Lat":-33.697904,"Long":150.949018,"Heading":150.0,"Speed":14},{"Key":"sensor1","DateTime":"2013-09-04T09:25:21+10:00","Lat":-33.697899,"Long":150.949596,"Heading":71.0,"Speed":31},{"Key":"sensor1","DateTime":"2013-09-04T09:25:34+10:00","Lat":-33.697633,"Long":150.950278,"Heading":60.0,"Speed":6},{"Key":"sensor1","DateTime":"2013-09-04T09:25:44+10:00","Lat":-33.698053,"Long":150.95093,"Heading":136.0,"Speed":42},{"Key":"sensor1","DateTime":"2013-09-04T09:25:54+10:00","Lat":-33.699021,"Long":150.951631,"Heading":172.0,"Speed":42},{"Key":"sensor1","DateTime":"2013-09-04T09:26:04+10:00","Lat":-33.699581,"Long":150.951561,"Heading":249.0,"Speed":31},{"Key":"sensor1","DateTime":"2013-09-04T09:26:14+10:00","Lat":-33.699943,"Long":150.950365,"Heading":254.0,"Speed":33},{"Key":"sensor1","DateTime":"2013-09-04T09:26:24+10:00","Lat":-33.699609,"Long":150.949634,"Heading":312.0,"Speed":44},{"Key":"sensor1","DateTime":"2013-09-04T09:26:34+10:00","Lat":-33.698913,"Long":150.948713,"Heading":314.0,"Speed":43},{"Key":"sensor1","DateTime":"2013-09-04T09:26:44+10:00","Lat":-33.697978,"Long":150.947943,"Heading":350.0,"Speed":50},{"Key":"sensor1","DateTime":"2013-09-04T09:26:54+10:00","Lat":-33.696968,"Long":150.947936,"Heading":295.0,"Speed":25},{"Key":"sensor1","DateTime":"2013-09-04T09:27:04+10:00","Lat":-33.697046,"Long":150.946673,"Heading":251.0,"Speed":46},{"Key":"sensor1","DateTime":"2013-09-04T09:27:14+10:00","Lat":-33.697473,"Long":150.945416,"Heading":250.0,"Speed":50},{"Key":"sensor1","DateTime":"2013-09-04T09:27:24+10:00","Lat":-33.697876,"Long":150.943949,"Heading":257.0,"Speed":54},{"Key":"sensor1","DateTime":"2013-09-04T09:27:34+10:00","Lat":-33.697866,"Long":150.942326,"Heading":277.0,"Speed":50},{"Key":"sensor1","DateTime":"2013-09-04T09:27:44+10:00","Lat":-33.697496,"Long":150.941381,"Heading":342.0,"Speed":37},{"Key":"sensor1","DateTime":"2013-09-04T09:27:54+10:00","Lat":-33.696556,"Long":150.941026,"Heading":341.0,"Speed":19},{"Key":"sensor1","DateTime":"2013-09-04T09:28:04+10:00","Lat":-33.696424,"Long":150.940913,"Heading":294.0,"Speed":16},{"Key":"sensor1","DateTime":"2013-09-04T09:28:14+10:00","Lat":-33.696531,"Long":150.939619,"Heading":261.0,"Speed":54},{"Key":"sensor1","DateTime":"2013-09-04T09:28:24+10:00","Lat":-33.696653,"Long":150.938214,"Heading":264.0,"Speed":29},{"Key":"sensor1","DateTime":"2013-09-04T09:28:34+10:00","Lat":-33.696744,"Long":150.937811,"Heading":283.0,"Speed":21},{"Key":"sensor1","DateTime":"2013-09-04T09:28:44+10:00","Lat":-33.695909,"Long":150.937266,"Heading":319.0,"Speed":49},{"Key":"sensor1","DateTime":"2013-09-04T09:28:54+10:00","Lat":-33.695131,"Long":150.935999,"Heading":294.0,"Speed":53},{"Key":"sensor1","DateTime":"2013-09-04T09:29:04+10:00","Lat":-33.694929,"Long":150.934709,"Heading":269.0,"Speed":49},{"Key":"sensor1","DateTime":"2013-09-04T09:29:14+10:00","Lat":-33.695546,"Long":150.933127,"Heading":229.0,"Speed":64},{"Key":"sensor1","DateTime":"2013-09-04T09:29:24+10:00","Lat":-33.696386,"Long":150.931827,"Heading":243.0,"Speed":29},{"Key":"sensor1","DateTime":"2013-09-04T09:29:34+10:00","Lat":-33.695751,"Long":150.931546,"Heading":359.0,"Speed":46},{"Key":"sensor1","DateTime":"2013-09-04T09:29:44+10:00","Lat":-33.694866,"Long":150.931501,"Heading":9.0,"Speed":36},{"Key":"sensor1","DateTime":"2013-09-04T09:29:54+10:00","Lat":-33.693836,"Long":150.931094,"Heading":327.0,"Speed":51},{"Key":"sensor1","DateTime":"2013-09-04T09:30:04+10:00","Lat":-33.692824,"Long":150.929959,"Heading":316.0,"Speed":56},{"Key":"sensor1","DateTime":"2013-09-04T09:30:14+10:00","Lat":-33.691719,"Long":150.929204,"Heading":346.0,"Speed":55},{"Key":"sensor1","DateTime":"2013-09-04T09:30:24+10:00","Lat":-33.690373,"Long":150.928637,"Heading":330.0,"Speed":51},{"Key":"sensor1","DateTime":"2013-09-04T09:30:51+10:00","Lat":-33.690083,"Long":150.928431,"Heading":329.0,"Speed":15},{"Key":"sensor1","DateTime":"2013-09-04T09:31:01+10:00","Lat":-33.689213,"Long":150.927736,"Heading":323.0,"Speed":50},{"Key":"sensor1","DateTime":"2013-09-04T09:31:11+10:00","Lat":-33.688236,"Long":150.926652,"Heading":311.0,"Speed":53},{"Key":"sensor1","DateTime":"2013-09-04T09:31:21+10:00","Lat":-33.688266,"Long":150.925791,"Heading":230.0,"Speed":43},{"Key":"sensor1","DateTime":"2013-09-04T09:31:32+10:00","Lat":-33.688799,"Long":150.924939,"Heading":231.0,"Speed":3},{"Key":"sensor1","DateTime":"2013-09-04T09:32:14+10:00","Lat":-33.688856,"Long":150.924861,"Heading":230.0,"Speed":22},{"Key":"sensor1","DateTime":"2013-09-04T09:32:24+10:00","Lat":-33.689453,"Long":150.924032,"Heading":215.0,"Speed":16},{"Key":"sensor1","DateTime":"2013-09-04T09:32:34+10:00","Lat":-33.689794,"Long":150.924321,"Heading":145.0,"Speed":4},{"Key":"sensor1","DateTime":"2013-09-04T09:32:44+10:00","Lat":-33.689846,"Long":150.924357,"Heading":147.0,"Speed":16},{"Key":"sensor1","DateTime":"2013-09-04T09:32:56+10:00","Lat":-33.690116,"Long":150.924631,"Heading":93.0,"Speed":5},{"Key":"sensor1","DateTime":"2013-09-04T09:33:06+10:00","Lat":-33.689966,"Long":150.924704,"Heading":87.0,"Speed":1},{"Key":"sensor1","DateTime":"2013-09-04T09:33:19+10:00","Lat":-33.689864,"Long":150.924732,"Heading":87.0,"Speed":1}];
	return jsonify(data)

if __name__ == "__main__":
	netDB = NetDB(name="netdata.db")
	app.run(debug=True)
