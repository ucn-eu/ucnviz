import sqlite3
import logging
import re
import operator
import urllib
from datetime import datetime
import time
import math
from tld import get_tld
from os import listdir
from os.path import isfile, isdir, join
import json

logger = logging.getLogger( "ucn_logger" )

def reconnect(fn):
	""" decorator to reconnect to the database if needed """
	def wrapped(self, *args, **kwargs):
		if self.connected is not True:
			self.connect()
		return fn(self, *args, **kwargs)
	return wrapped
	
class NetDB( object ):
	''' classdocs '''

	def __init__( self, name):
		self.name = name
		self.connected = False
	#///////////////////////////////////////
	
			
	def connect( self ):
		#log.debug( "connecting to sqllite database %s" % self.name )
		if self.connected is False:
			self.conn = sqlite3.connect("%s" % self.name, check_same_thread = False)
			self.connected = True
		
	def date_from_ts(self, tstamp):
		return datetime.fromtimestamp(int(tstamp)).strftime('%Y-%m-%d %H:%M:%S')

	@reconnect
	def fetch_range_for_host(self, host):
		result = self.conn.execute("SELECT min(ts), max(ts) FROM URLS WHERE host = '%s'" % host)
		range = [{"from":row[0], "to":row[1]} for row in result]
		return range
	
	
	#could perhaps simplify to return count UNIQUE top level domains seen within timerange rather than count of all
	#not too crucial as the purpose here is just to give an indication of activity levels. 
	@reconnect
	def fetchtimebins_for_hosts(self, binsize,hosts,fromts=None, tots=None):
	
		hlist = "%s" % (",".join("'{0}'".format(h) for h in hosts))
		whereclause = ""
		
		if fromts is not None and tots is not None:
			whereclause = "AND (u.ts >= %d AND u.ts < %d)" % (fromts, tots)
		
		minmaxsql = "SELECT min(u.ts), max(u.ts) from URLS u WHERE u.host IN(%s) %s" % (hlist,whereclause)
			
		#minmaxsql = "SELECT min(u.ts), max(u.ts) from URLS u WHERE u.host IN(%s) %s UNION SELECT  min(d.ts), max(d.ts) from DNS d WHERE d.host IN(%s) %s" % (hlist,whereclause,hlist,dnswhereclause)
		result = self.conn.execute(minmaxsql)
		row = result.fetchone()
		mints = row[0]
		maxts = row[1]
		
		sql = "SELECT u.ts, u.tld, u.host from URLS u WHERE u.host IN (%s) %s ORDER BY u.host, u.ts ASC" % (hlist,whereclause)
		
		try:
			result = self.conn.execute(sql)
		except Exception, e:
			logger.error("error fetching timebins for home %s" % home)
			return None
			 
		hosts = {}
		
		seen = {} #for filtering out duplicate tlds within timebin
		
		ts = mints
		keys = []
		indexes = {}
		
		c = 0
		while ts < maxts+binsize:
			keys.append(self.binlabel(binsize, ts))
			indexes[self.binlabel(binsize, ts)] = c
			c = c + 1
			ts = ts + binsize
		
		
		for row in result:
			
			host = row[2]
 			ts   = row[0]
 			idx = indexes[self.binlabel(binsize, ts)]
# 			idx = keys.index(self.binlabel(binsize, ts))
 			
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
	
	@reconnect		
	def fetch_timebins_for_host(self, binsize, host, fromts=None, tots=None, filters=None):
		whereclause = ""
		dnswhereclause = ""
		if fromts is not None and tots is not None:
			whereclause = "AND (ts >= %d AND ts < %d)" % (fromts, tots)
		
		if filters is not None:
			whereclause = "%s %s " % (whereclause, "AND tld NOT IN (%s)" % ",".join("'{0}'".format(w) for w in filters))
				
		sql = "SELECT ts, domain from URLS where host = '%s' %s ORDER BY ts ASC" % (host,whereclause)
		
		
		result = self.conn.execute(sql)
		urls = [{"ts":row[0], "domain":row[1]} for row in result]
		

		if len(urls) <= 0:
			return []
	
		bins = {}
		binhistory = {}
		
		for url in urls:
			label = self.binlabel(binsize, url['ts'])
		
			if label in bins:
				bin = bins[label]
				#if self.seen(binhistory, url['domain'], label) is False:
				bin = bin + 1
			else:
				#self.seen(binhistory, url['domain'], label)
				bin = 1	
				
			bins[label] = bin  
		
		return sorted(bins.iteritems(), key=operator.itemgetter(0))
	
	@reconnect	
	def seen(self, binhistory, domain, label):
		if (label in binhistory):
			if (domain in binhistory[label]):
				return True
			else:
				binhistory[label].append(domain)
		else:
			binhistory[label] = [domain]

		return False
	@reconnect
	def binlabel(self, binsize, ts):
		return int(math.floor(ts/binsize)*binsize)
	
	@reconnect				
	def fetch_device_hosts(self):
		result = self.conn.execute("SELECT DISTINCT(host) FROM PROCESSES")
		hosts = [row[0] for row in result]
		return hosts
	
	@reconnect
	def fetch_device_processes(self, host):
		result = self.conn.execute("SELECT DISTINCT(name) FROM PROCESSES WHERE host = '%s'" % host)
		hosts = [row[0] for row in result]
		hosts.sort()
		return hosts
	
	@reconnect	
	def fetch_min_max_processes(self, host):
		sql = "select min(starttime) as min, max(starttime) as max FROM processes WHERE host = '%s'" %  host
		result = self.conn.execute(sql)
		minmax = result.fetchone()
		return minmax
		#return {min:minmax[0], max:minmax[1]}
	
	@reconnect
	def fetch_details_for_process(self, host, processname):
		sql = "SELECT ts,starttime FROM PROCESSES WHERE host = '%s' AND name = '%s' ORDER BY ts ASC" % (host, processname)
		result = self.conn.execute(sql)
		hosts = [{"ts":row[0], "duration":row[0]-row[1]} for row in result]
		return hosts
	
	@reconnect
	def fetch_device_max_process_ts(self, host):
		sql = "SELECT MAX(starttime) FROM PROCESSES WHERE host = '%s'" % host 
		result = self.conn.execute(sql)
		return result.fetchone()[0]
	
	@reconnect
	def fetch_hosts(self,filter):
		sql = "SELECT DISTINCT(host) FROM URLS WHERE host LIKE '%%%s%%'" % filter
		result = self.conn.execute(sql)
		hosts = [row[0] for row in result]
		return hosts
	
	@reconnect	
	def fetch_queries_for_host(self,host,fromts=None, tots=None):
	
		searchsplits = {'google.com':'q=',
					'google.co.uk':'q=',
					'bing.com':'q=',
					'duckduckgo.com':'q=',
					'bing.com':'search_query=',
					'yahoo.com':'p=',
					'amazon.co.uk':'field-keywords=',
					'amazon.com':'field-keywords=',
					'ebay.com':'kwd=',
					'ebay.co.uk':'_nkw=',
					'youtube.com':'search_query='
		}
		
		for key in searchsplits.keys():
			searchsplits['%s.%s'%('www',key)] = searchsplits[key]
	
		domains = searchsplits.keys()
		timerange = ""
		
		if fromts and tots:
			timerange = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
			
		sql = "SELECT ts,domain,path FROM URLS WHERE host = '%s' AND path <> '' AND domain IN (%s) %s ORDER BY ts ASC" % (host, ",".join("'{0}'".format(w) for w in domains), timerange)
		
		result = self.conn.execute(sql)	
		
		urls = [{"ts":row[0], "domain":row[1], "path":row[2]} for row in result]
		
		
		queries = []
		lastquery = ""
		lastts = 0 
		appended = False
		
		for url in urls:
			qstring =url['path'].split(searchsplits[url['domain']])
			if len(qstring) > 1:
				term = qstring[1].split("&")[0]
				try:
					term = urllib.unquote(term).decode('utf-8')
					term = term.replace("+", " ")
					term = term.replace("%20", " ")
					if lastquery not in term:
			 			queries.append({'query':lastquery, 'ts':url['ts']})
			 			appended = True
			 		else:
			 			appended = False
			 			
			 		lastquery = term 
			 		lastts = url['ts']
				except Exception, e:
					logger.error("couldn't encode %s" % term)
	
		if lastquery and not appended:
			queries.append({'query':lastquery, 'ts':lastts})
			
		return queries
	
	@reconnect
	def fetch_urls_for_tag(self, host, tag):
		sql = "SELECT domain FROM tags WHERE tag = '%s' AND host = '%s'" % (tag, host)
		
		result = self.conn.execute(sql)
		urls = [row[0] for row in result]
		return urls
	
	@reconnect
	def fetch_tags_for_host(self, host):
		
		result = self.conn.execute("SELECT tag FROM tag WHERE host = ?", (host,))
		
		tags = [row[0] for row in result]
		
		if len(tags) <= 0:
			logger.debug("creating default set of tables for tags for host %s" % host)
			#create the default set of tags for this host!
			tags = ["research", "work", "gaming", "finance", "family", "video streaming", "shopping", "health", "social", "hobby", "news", "entertainment"]

			for tag in tags:
				result = self.conn.execute("INSERT INTO TAG (tag, host) VALUES (?,?)", (tag, host))	
			self.conn.commit()
		tags.sort()
		return tags
	
# 	@reconnect
# 	def fetch_tags(self):
# 		sql = "SELECT tag FROM TAG"
# 		result = self.conn.execute(sql)
# 		tags = [row[0] for row in result]
# 		tags.sort()
# 		return tags
	
	
	def fetch_tagged_for_hosts(self, hosts, fromts=None, tots=None):
		hlist = "%s" % (",".join("'{0}'".format(h) for h in hosts))
		#milliseconds
		delta = 10000
		
		timerange=""
		
		if fromts and tots:
			timerange = "AND (u.ts >= %s AND u.ts < %s)" % (fromts, tots)
			

		result = self.conn.execute("SELECT t.tag, u.ts, u.domain, t.host FROM TAGS t, URLS u WHERE t.host IN(%s) %s AND (t.domain = u.domain OR t.domain = u.tld) ORDER BY t.tag, u.ts ASC" % (hlist, timerange))
		
		currenttag = None
		reading = None
		readings = []
		host = None
		lasthost = None
		tags = {}
		
		for row in result:
			host = row[3]
			if host not in tags:
				tags[host] = []
				if lasthost:
					tags[lasthost].append(reading)	
					reading = None
						
			lasthost = host
			
			if currenttag != row[0]:
				if reading is not None:
					tags[host].append(reading)
				reading = {"tag":row[0], "fromts":row[1], "tots":row[1], "domain":row[2]} 	
				currenttag = row[0]
			else:
				if (reading["tots"] + delta) >= row[1]:
					reading["tots"] = row[1]
				else:
					tags[host].append(reading)
					reading = {"tag":row[0], "fromts":row[1], "tots":row[1],"domain":row[2]} 
		
		if reading:
			tags[host].append(reading)
		
		return tags
	
	@reconnect
	def fetch_tagged_for_host(self, host, fromts=None, tots=None):
		
		#IF FROMTS AND TOTS ARE NONE, SET THEM TO MAX, MIN OF TIMEFRAME
		
		#milliseconds
		delta = 10000
		
		timerange=""
		
		if fromts and tots:
			timerange = "AND (u.ts >= %s AND u.ts <= %s)" % (fromts, tots)
		
		#sql = "SELECT t.tag, u.ts, u.domain FROM TAGS t LEFT JOIN urls u ON ((u.domain = t.domain AND  u.ts >= t.fromts AND u.ts <=  t.tots) %s)" % (timerange)
		sql = "SELECT t.tag, u.ts, u.domain FROM TAGS t, URLS u WHERE (((u.domain = t.domain OR u.tld = t.domain) AND  u.ts >= t.fromts AND u.ts <=  t.tots) %s) ORDER BY u.domain" % (timerange)
		
		result = self.conn.execute(sql)
		
		currenttag = None
		reading = None
		readings = []
		#activity = []
		
		for row in result:
			if currenttag != row[0]:
				if reading is not None:
					readings.append(reading)
				reading = {"tag":row[0], "fromts":row[1], "tots":row[1], "domain":row[2]} 	
				currenttag = row[0]
			else:
				if (reading["tots"] + delta) >= row[1]:
					reading["tots"] = row[1]
				else:
					readings.append(reading)
					reading = {"tag":row[0], "fromts":row[1], "tots":row[1],"domain":row[2]} 
		
		if reading:
			readings.append(reading)
		
		return readings
	
	@reconnect
	def fetch_tags(self):
		sql = "SELECT tag FROM TAG"
		result = self.conn.execute(sql)
		tags = [row[0] for row in result]
		tags.sort()
		return tags
			
	@reconnect	
	def fetch_urls_for_tagging(self, host, fromts=None, tots=None, filters=None):

		whereclause = ""
		
		if fromts and tots:
			whereclause = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
		
		if filters is not None:
			whereclause = "%s %s " % (whereclause, "AND u.tld NOT IN (%s)" % ",".join("'{0}'".format(w) for w in filters))
				
		
		#this will multiple tld count by number of entries in tags table, so doesn't now work when support multiple tags
		#sql = "SELECT DISTINCT(u.tld), COUNT(u.tld) as requests, GROUP_CONCAT(DISTINCT(t.tag)) FROM URLS u LEFT JOIN TAGS t ON (u.tld = t.domain) AND t.host = u.host WHERE u.host = '%s' %s GROUP BY u.tld ORDER BY requests DESC" % (host, whereclause)
		
		#following  query is too slow, TODO rewrite!
		#sql = "SELECT DISTINCT(u.tld), c.tldcount as requests,GROUP_CONCAT(DISTINCT(t.tag)) FROM urls u LEFT JOIN (SELECT tld, count(tld) as tldcount FROM urls WHERE ts >= %s AND ts <= %s GROUP BY tld) c ON c.tld = u.tld LEFT JOIN TAGS t ON (u.tld = t.domain OR u.domain = t.domain) AND t.host = u.host WHERE u.host = '%s' %s GROUP BY u.tld ORDER BY requests DESC" % (fromts, tots, host, whereclause)
		
		#..just don't count requests for now..
		sql = "SELECT DISTINCT(u.tld), GROUP_CONCAT(DISTINCT(t.tag)) FROM URLS u LEFT JOIN TAGS t ON (u.tld = t.domain) AND t.host = u.host WHERE u.host = '%s' %s GROUP BY u.tld  ORDER BY u.tld" % (host, whereclause)
		
		result = self.conn.execute(sql)
		urls = [{"domain":row[0], "requests":0, "tag":row[1]} for row in result]
		
		return urls
	
	
	@reconnect
	def fetch_apps_for_hosts(self, hosts,fromts=None, tots=None):
		hlist = "%s" % (",".join("'{0}'".format(h) for h in hosts))
		
		delta = 60*60*1000
		result = self.conn.execute("SELECT p.name, p.ts, p.host FROM PROCESSES p WHERE  p.foreground = 1 AND p.host IN (%s) ORDER BY p.host, p.name, p.ts ASC" % (hlist))
		
		apps = {}
		currentapp= None
		app = None
		host = None
		lasthost = None
		
		for row in result:
			host = row[2]
			if host not in apps:
				apps[host] = []
				if lasthost:
					apps[lasthost].append(app)	
					app = None
						
			lasthost = host
			if currentapp != row[0]:
				if app is not None:
					apps[host].append(app)
				app = {"name":row[0], "start":row[1], "end":row[1]} 	
				currentapp = row[0]
			else:
				if (app["end"] + delta) >= row[1]:
					app["end"] = row[1]
				else:
					apps[host].append(app)
					app = {"name":row[0], "start":row[1], "end":row[1]} 		
		if app:
			apps[host].append(app)
		
		return apps
	
	def fetch_notes_for_hosts(self,hosts,fromts,tots):
		hlist = "%s" % (",".join("'{0}'".format(h) for h in hosts))
		result = self.conn.execute("SELECT host, fromts, tots, note, id  FROM notes WHERE host in(%s) AND fromts >= %s AND tots <= %s ORDER BY host" % (hlist,fromts,tots))
		notes = [{'host': row[0], 'fromts': row[1], 'tots': row[2], 'note': row[3], 'id':row[4]} for row in result]
		return notes
	
# 	#deprecated, use fetch_apps_for_hosts
# 	@reconnect
# 	def fetch_apps_for_home(self, home,fromts=None, tots=None):
# 		delta = 60*60*1000
# 		result = self.conn.execute("SELECT p.name, p.ts, p.host FROM PROCESSES p, HOUSE h  WHERE  p.foreground = 1 AND p.host = h.host AND h.name = ? ORDER BY p.host, p.name, p.ts ASC", (home,))
# 		
# 		apps = {}
# 		currentapp= None
# 		app = None
# 		host = None
# 		lasthost = None
# 		
# 		for row in result:
# 			host = row[2]
# 			if host not in apps:
# 				apps[host] = []
# 				if lasthost:
# 					apps[lasthost].append(app)	
# 					app = None
# 						
# 			lasthost = host
# 			if currentapp != row[0]:
# 				if app is not None:
# 					apps[host].append(app)
# 				app = {"name":row[0], "start":row[1], "end":row[1]} 	
# 				currentapp = row[0]
# 			else:
# 				if (app["end"] + delta) >= row[1]:
# 					app["end"] = row[1]
# 				else:
# 					apps[host].append(app)
# 					app = {"name":row[0], "start":row[1], "end":row[1]} 		
# 		if app:
# 			apps[host].append(app)
# 		
# 		return apps
				

	#return foregrounded apps along with timerange that have been in foreground
	@reconnect
	def fetch_apps_for_host(self, host, fromts=None, tots=None):
		delta = 60*60*1000
		result = self.conn.execute("SELECT name, ts FROM PROCESSES WHERE host = ? AND foreground = 1 ORDER BY name,ts ASC", (host,))
		
		currentapp= None
		app = None
		apps = []
		
		for row in result:
			if currentapp != row[0]:
				if app is not None:
					apps.append(app)
				app = {"name":row[0], "start":row[1], "end":row[1]} 	
				currentapp = row[0]
			else:
				if (app["end"] + delta) >= row[1]:
					app["end"] = row[1]
				else:
					apps.append(app)
					app = {"domain":row[0], "start":row[1], "end":row[1]} 
		
		if app:
			apps.append(app)
		
		
		return apps
			
	@reconnect
	def fetch_top_urls_for_host(self, host, limit=10, fromts=None, tots=None):
		timerange = ""
		
		if fromts and tots:
			timerange = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
		
		sql = "SELECT DISTINCT(domain), count(domain) AS requests FROM URLS WHERE host = '%s' %s GROUP BY domain ORDER BY requests DESC LIMIT %d" % (host, timerange, limit)
		
	
		result = self.conn.execute(sql)
		urls = [{"domain":row[0], "requests":row[1]} for row in result]
		
		return urls
	
	@reconnect
	def fetch_urls_for_host(self, host, fromts=None, tots=None, filters=None):
		delta = 10000
		whereclause = ""
		
		if fromts and tots:
			whereclause = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
		
		if filters is not None:
			whereclause = "%s %s " % (whereclause, "AND tld NOT IN (%s)" % ",".join("'{0}'".format(w) for w in filters))
		
		
		sql = "SELECT ts,host,domain, tld FROM URLS WHERE host = '%s' %s ORDER BY host, ts ASC" % (host,whereclause)
		
		result = self.conn.execute(sql)
		
		currenthost = None
		url = None
		urls = []
		
		for row in result:
			if currenthost != row[2]:
				if url is not None:
					urls.append(url)
				url = {"domain":row[2], "fromts":row[0], "tots":row[0]} 	
				currenthost = row[2]
			else:
				if (url["tots"] + delta) >= row[0]:
					url["tots"] = row[0]
				else:
					urls.append(url)
					url = {"domain":row[2], "fromts":row[0], "tots":row[0]} 
		
		if url:
			urls.append(url)
		
		return urls
		
	@reconnect	
	def fetch_domain_requests_for_host(self, host,domain,fromts, tots):
		timerange = ""
		
		if fromts and tots:
			timerange = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
		
		result = self.conn.execute("SELECT ts FROM URLS WHERE host = '%s' AND domain = '%s' %s ORDER BY ts DESC" % (host,domain,timerange))
		requests = [row[0] for row in result]
		return requests
	
	@reconnect
	def fetch_netdata_for_host(self, host):
		result = self.conn.execute("SELECT ts,wifiup,wifidown,cellup,celldown from NETDATA WHERE host = ? ORDER BY ts DESC", (host,))
		netdata = [{"ts":row[0], "wifiup":row[1], "wifidown":row[2], "cellup":row[3], "celldown":row[4]} for row in result]
		return netdata
	
	@reconnect
	def fetch_hosts_for_home(self, home):
		result = self.conn.execute("SELECT host FROM HOUSE WHERE name = ?", (home,))
		hosts = [row[0] for row in result]
		return hosts
	
	#deprecated, use fetch_latest_ts_for_hosts
	@reconnect	
	def fetch_latest_ts_for_home(self, home):
		result = self.conn.execute("SELECT max(u.ts) FROM URLS u, HOUSE h WHERE u.host = h.host AND h.name = (?)",(home,))
		ts = result.fetchone()
		return ts[0]
	
	@reconnect	
	def fetch_latest_ts_for_hosts(self, hosts):
		hlist = "%s" % (",".join("'{0}'".format(h) for h in hosts))
		result = self.conn.execute("SELECT max(u.ts) FROM URLS u WHERE u.host IN (%s)" % (hlist))
		ts = result.fetchone()
		return ts[0]
		
	@reconnect
	def fetch_latest_ts_for_host(self, host):
		result = self.conn.execute("SELECT max(u.ts) FROM URLS u WHERE u.host = ?", (host,))
		return result.fetchone()[0]
	
	
	@reconnect
	def insert_note(self,note,host,fromts,tots):
		try:
			self.conn.execute("INSERT INTO NOTES(note,host,fromts,tots) VALUES (?,?,?,?)", (note,host,fromts,tots))
			self.conn.commit()
		except Exception, e:
			logger.error("failed to insert note %s for host %s %s %s" % (note, host, fromts, tots))
			return False
		return True
		
	@reconnect		
	def insert_tag_for_host(self, host,tld,tag,fromts,tots):
		try:
			self.conn.execute("INSERT INTO TAGS(host,domain,tag,fromts,tots) VALUES (?,?,?,?,?)", (host,tld,tag,fromts,tots))
			self.conn.commit()
		except Exception, e:
			logger.error("failed to insert tag %s for host %s %s %s %s %s" % (tag, host, domain, fromts, tots))
			return False
			
	@reconnect
	def insert_tag(self,tag, host):
		try:
			self.conn.execute("INSERT INTO TAG(tag, host) VALUES(?, ?)", (tag,host))
			self.conn.commit()
			return True
		except Exception, e:
			return False
	
	@reconnect		
	def remove_tag_association_for_host(self,host,domain,tag):
		self.conn.execute("DELETE FROM TAGS WHERE host=? AND domain = ? AND tag = ?", (host,domain,tag))
		self.conn.commit()
	
	@reconnect		
	def remove_tag_for_host(self, host,tag):
		try:
			self.conn.execute("DELETE FROM TAGS WHERE host=? AND tag = ?", (host,tag))
			self.conn.execute("DELETE FROM TAG WHERE host=? AND tag = ?", (host,tag))
			self.conn.commit()
			return True
		except Exception as e:
			logger.error("failed to remove tag %s for host %s" % (tag, host))
			return False
		
	@reconnect
	def insert_network_data(self, host, netdata):
		try:
			self.conn.execute("INSERT INTO NETDATA(ts, host, wifiup, wifidown,cellup,celldown) VALUES(?,?,?,?,?,?)", (netdata['ts'],host, netdata['wifiup'], netdata['wifidown'],netdata['cellup'], netdata['celldown']))
			self.conn.commit()
			return True
		except Exception as e:
			logger.error("failed to insert network data")
			return False
			
	@reconnect	
	def insert_process(self, process):
		self.conn.execute("INSERT INTO PROCESSES(ts,host,name,starttime) VALUES(?,?,?,?)", (process['ts'],process['host'], process['name'], process['starttime']))
		self.conn.commit()
	
	@reconnect	
	def bulk_insert_processes(self,host,processes):
		
		try:
			for process in processes:
				if "bytessent" not in process:
					process["bytessent"] = 0
				if "bytesrecv" not in process:
					process["bytesrecv"] = 0
				
				try:	
					self.conn.execute("INSERT INTO PROCESSES(ts,host,foreground,name,starttime,bytessent,bytesrecv) VALUES(?,?,?,?,?,?,?)", (process['ts'], host, process['foreground'],process['name'], process['starttime'], process['bytesrecv'], process['bytessent']))
				except Exception, e:
					logger.debug("error bulk inserting process %s for host" % (str(process), host))
			
			self.conn.commit()
			return True
		except Exception, e:
			logger.debug("error bulk inserting processes for host %s" % host)
			return False
			
	@reconnect	
	def bulk_insert_processes_from_file(self, datafile):
		datafiles = [f for f in listdir(datafile) if isdir(join(datafile,f))]
		devicefiles = []
	
		for device in datafiles:
			devicedir = join(datafile,device)
			devicefiles = [f for f in listdir(devicedir) if isfile(join(devicedir,f))]
			for dev in devicefiles:
				json_data=open(join(devicedir, dev))
				dobj = datetime.strptime(dev.split(".")[0], '%d-%m-%y_%H:%M:%S')
				ts = time.mktime(dobj.timetuple())
				data = json.load(json_data)
			
				if isinstance(data, list) is False:
					data = [data]
				
				for item in data:
					for process in item['processes']:
						try:
							self.conn.execute("INSERT INTO PROCESSES(ts,host,name,starttime) VALUES(?,?,?,?)", (ts, device, process['name'], process['starttime']))
						except Exception, e:
							logger.error("error process from file %s" % str(process))
		
		try:	
			self.conn.commit()
		except Exception, e:
			logger.error("error bulk commiting processes from file")
	
	
						
	@reconnect	
	def insert_url(self, url):
		try:
			self.conn.execute("INSERT INTO URLS(ts, host, tld, domain, path) VALUES(?,?,?,?,?)", (url['ts'], url['host'],url['tld'], url['domain'], url['path']))
			self.conn.commit()
		except Exception, e:
			logger.error("error inserting url %s" % str(url))
		
			
	@reconnect
	def bulk_insert_dns(self, content):
		logger.debug("in bulk insert dns")	
		for line in content:
			
			try:
				
				res = get_tld("http://%s"%line['domain'], as_object=True, fail_silently=True)
			
				if res is not None:	
					tld = "%s.%s" % (res.domain, res.suffix)
				else:
					tld = line['domain']
					
				logger.debug("inserting dns %s %s %s %s" % (line['ts'], line['host'], tld, line['domain']))
				self.conn.execute("INSERT INTO URLS(ts, host, tld, domain,datasource) VALUES(?,?,?,?,?)", (line['ts'], line['host'], tld, line['domain'], 'dns'))
			except Exception, e:
				logger.error("error inserting dns entry %s" % str(line))
		
		try:	
			self.conn.commit()
		except Exception, e:
			logger.error("error bulk committing dns")
			
	@reconnect
	def bulk_insert_urls(self, content):
		logger.debug("in bulk insert urls")	
		
		for line in content:
			
			items = line.split()
			
			if len(items) < 9:
				logger.error("error parsing line")
				logger.error(line)
			else:	
				if ("http" in items[8]  and "//" in items[8]):
					parts  = items[8].split("//")[1].split("/")
				
					domain = parts[0]
					res = get_tld(items[8], as_object=True, fail_silently=True)
			
					if res is not None:	
						tld = "%s.%s" % (res.domain, res.suffix)
					else:
						tld = parts[0]
					path = ""
					if len(parts) > 0:
						path = "".join(parts[1:])
				
					url = {'ts':items[2].split(".")[0], 'host':items[4], 'tld':tld, 'domain':domain, 'path': path}
					try:
						logger.debug("inserting %s %s %s" % (url['ts'], url['host'], url['tld']))
						self.conn.execute("INSERT INTO URLS(ts, host, tld, domain, path, datasource) VALUES(?,?,?,?,?,?)", (url['ts'], url['host'],url['tld'], url['domain'], url['path'], 'squid'))
					except Exception, e:
						logger.error("error inserting url %s" % str(url))
					
		#commit now..
		try:	
			self.conn.commit()
		except Exception, e:
			logger.error("error bulk committing urls")
			
	@reconnect	
	def insert_zone(self,zone):
		try:
			self.conn.execute("INSERT INTO ZONES(host, date,locationid, name, lat, lng, enter, exit) VALUES(?,?,?,?,?,?,?,?)", (zone['host'],zone['date'],zone['locationid'], zone['name'], zone['lat'], zone['lng'], zone['enter'], zone['exit']))
			self.conn.commit()
		except Exception, e:
			logger.error("error inserting zone %s" % str(zone))
	
	@reconnect
	def remove_zones(self, host, date):
		try:
			self.conn.execute("DELETE FROM ZONES WHERE host = ? AND date = ?" , (host, date))
			self.conn.commit()
		except Exception, e:
			logger.error("error removing zones %s %s" % (host, date))
			
	@reconnect
	def insert_zones(self, zones):
		try:
			for zone in zones:
				self.conn.execute("INSERT INTO ZONES(host, date, locationid, name, lat, lng, enter, exit) VALUES(?,?,?,?,?,?,?,?)", (zone['host'],zone['date'],zone['locationid'], zone['name'], zone['lat'], zone['lng'], zone['enter'], zone['exit']))
			self.conn.commit()
		except Exception, e:
			logger.error("error inserting zones %s" % str(zones))
	
	@reconnect
	def fetch_zones_for_home(self, home,fromts=None, tots=None):
		result = self.conn.execute("SELECT z.name,z.enter,z.exit, z.host FROM ZONES z, HOUSE h WHERE h.name= ? AND h.host = z.host ORDER BY z.host, z.enter DESC", (home,))
		#zones = [{"name":row[0] or "unlabelled", "enter":row[1], "exit":row[2]} for row in result]
		zones = {}
		for row in result:
			if row[3] not in zones:
				zones[row[3]] = []
			zones[row[3]].append({"name":row[0] or "unlabelled", "enter":row[1], "exit":row[2]})
			
		return zones	
	
	@reconnect
	def fetch_zones_for_hosts(self, hosts,fromts=None, tots=None):
		hlist = "%s" % (",".join("'{0}'".format(h) for h in hosts))
		result = self.conn.execute("SELECT z.name,z.enter,z.exit, z.host FROM ZONES z WHERE z.host IN (%s) ORDER BY z.host, z.enter DESC" % (hlist))
		#zones = [{"name":row[0] or "unlabelled", "enter":row[1], "exit":row[2]} for row in result]
		zones = {}
		for row in result:
			if row[3] not in zones:
				zones[row[3]] = []
			zones[row[3]].append({"name":row[0] or "unlabelled", "enter":row[1], "exit":row[2]})
			
		return zones	
			
	@reconnect
	def fetch_zones_for_host(self, host, fromts=None, tots=None):
		
		timerange = ""
		
# 		if fromts and tots:
#  			timerange = "AND (enter >= %s AND exit <= %s)" % (fromts, tots)
		
		
		result = self.conn.execute("SELECT name,enter,exit FROM ZONES WHERE host = ? ORDER BY enter DESC", (host,))
		zones = [{"name":row[0] or "unlabelled", "enter":row[1], "exit":row[2]} for row in result]

		return zones	
				
	@reconnect	
	def add_host_to_house(self, host):
		try:
			self.conn.execute("INSERT INTO HOUSE(name, host) VALUES(?,?)", (host['house'], host['host']))
			self.conn.commit()
		except Exception, e:
			logger.error("error adding host to house %s" % str(host))
			
	@reconnect			
	def createTables(self):
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS HOUSE
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			name CHAR(128),
			host CHAR(16),
			UNIQUE(host) ON CONFLICT REPLACE);''')
			
		self.conn.execute('''CREATE TABLE IF NOT EXISTS URLS
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			ts INTEGER,
			host CHAR(16),
			tld CHAR(255),
			domain CHAR(255),
			datasource CHAR(16),
			path TEXT,
			UNIQUE(ts, host, tld, domain,datasource) ON CONFLICT IGNORE);''')
		
# 		self.conn.execute('''CREATE TABLE IF NOT EXISTS DNS
# 			(id INTEGER PRIMARY KEY AUTOINCREMENT,
# 			ts INTEGER,
# 			host CHAR(16),
# 			tld CHAR(255),
# 			domain CHAR(255),
# 			UNIQUE(ts, host, tld, domain) ON CONFLICT IGNORE);''')
			
		self.conn.execute('''CREATE TABLE IF NOT EXISTS ZONES
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			date CHAR(16),
			locationid INTEGER,
			host CHAR(16),
			name  CHAR(128),
			lat REAL,
			lng REAL,
			enter INTEGER,
			exit INTEGER);''')
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS PROCESSES
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			ts INTEGER,
			foreground INTEGER,
			host CHAR(16),
			name  CHAR(128),
			bytessent INTEGER,
			bytesrecv INTEGER,
			starttime INTEGER,
			UNIQUE(ts, host, name) ON CONFLICT IGNORE);''')
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS NETDATA
			(ts INTEGER,
			host CHAR(16),
			wifiup  INTEGER,
			wifidown INTEGER,
			cellup INTEGER,
			celldown INTEGER,
			UNIQUE(ts, host, wifiup, wifidown, cellup, celldown) ON CONFLICT IGNORE);''')
			
		self.conn.execute('''CREATE TABLE IF NOT EXISTS TAGS
			(host CHAR(16),
			domain CHAR(128),
			tag  CHAR(128),
			fromts INTEGER,
			tots INTEGER,
			UNIQUE(host, domain, tag, fromts, tots) ON CONFLICT IGNORE);''')		
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS TAG
			(tag CHAR(128),
			 host CHAR(16),
			 UNIQUE(tag,host) ON CONFLICT REPLACE);''')
			
			
		self.conn.execute('''CREATE TABLE IF NOT EXISTS NOTES
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			host CHAR(16),
			fromts INTEGER,
			tots INTEGER,
			note TEXT,
			UNIQUE(host,fromts,tots) ON CONFLICT REPLACE);''')		
		
	
