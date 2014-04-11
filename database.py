import sqlite3
import MySQLdb
import logging
import re
import operator
import urllib
from datetime import datetime
import time

log = logging.getLogger( "console_log" )

class NetDB( object ):
	''' classdocs '''

	def __init__( self, name):
		self.name = name
		self.connected = False
	#///////////////////////////////////////

	def connect( self ):
		#log.debug( "connecting to sqllite database %s" % self.name )
		if self.connected is False:
			self.conn = sqlite3.connect("%s" % self.name)
			self.connected = True
		
	def date_from_ts(self, tstamp):
		return datetime.fromtimestamp(int(tstamp)).strftime('%Y-%m-%d %H:%M:%S')

	def fetch_range_for_host(self, host):
		result = self.conn.execute("SELECT min(ts), max(ts) FROM URLS WHERE host = '%s'" % host)
		range = [{"from":row[0], "to":row[1]} for row in result]
		return range
	
	def fetch_timebins_for_host(self, binsize, host, fromts=None, tots=None):
		whereclause = ""
		if fromts is not None and tots is not None:
			whereclause = "AND (ts >= %d AND ts < %d)" % (fromts, tots)
			
		sql = "SELECT ts, domain from URLS where host = '%s' %s ORDER BY ts ASC" % (host,whereclause)
		print sql
		result = self.conn.execute(sql)
		urls = [{"ts":row[0], "domain":row[1]} for row in result]
		#get the start of day time of the smallest ts
		startts = time.mktime(datetime.strptime(datetime.fromtimestamp(urls[0]['ts']).strftime('%Y-%m-%d'), '%Y-%m-%d').timetuple())

		bins = {}
		binhistory = {}
		
		for url in urls:
			label = self.binlabel(binsize=binsize, startts=startts, ts=url['ts'])
		
			if label in bins:
				bin = bins[label]
				if self.seen(binhistory, url['domain'], label) is False:
					bin = bin + 1
			else:
				self.seen(binhistory, url['domain'], label)
				bin = 1	
				
			bins[label] = bin  
		
		print binhistory
		
		return sorted(bins.iteritems(), key=operator.itemgetter(0))
		
	def seen(self, binhistory, domain, label):
		if (label in binhistory):
			if (domain in binhistory[label]):
				return True
		else:
			binhistory[label] = [domain]

		return False
			
	def binlabel(self,binsize, startts, ts): 
		bintime = startts + (((ts-startts) / int(binsize)) * binsize)
		
		#set date date grouping based on bin size
		dformat = '%Y/%m/01'
		
		if binsize >= 60*60*24:
			dformat = '%Y/%m/%d'
		elif binsize >= 60*60:
			dformat = '%Y/%m/%d %H:00'
		elif binsize >= 60: 
			dformat = '%Y/%m/%d %H:%M'
			
		return datetime.fromtimestamp(bintime).strftime(dformat)
	
	def fetch_device_hosts(self):
		result = self.conn.execute("SELECT DISTINCT(host) FROM PROCESSES")
		hosts = [row[0] for row in result]
		return hosts
	
	def fetch_device_processes(self, host):
		result = self.conn.execute("SELECT DISTINCT(name) FROM PROCESSES WHERE host = '%s'" % host)
		hosts = [row[0] for row in result]
		hosts.sort()
		return hosts
		
	def fetch_details_for_process(self, host, processname):
		sql = "SELECT ts,starttime FROM PROCESSES WHERE host = '%s' AND name = '%s' ORDER BY ts ASC" % (host, processname)
		print sql
		result = self.conn.execute(sql)
		hosts = [{"ts":row[0], "duration":row[0]-row[1]} for row in result]
		return hosts
	
	def fetch_device_max_process_ts(self, host):
		sql = "SELECT MAX(starttime) FROM PROCESSES WHERE host = '%s'" % host 
		result = self.conn.execute(sql)
		return result.fetchone()[0]
			
	def fetch_hosts(self,filter):
		sql = "SELECT DISTINCT(host) FROM URLS WHERE host LIKE '%%%s%%'" % filter
		result = self.conn.execute(sql)
		hosts = [row[0] for row in result]
		return hosts
	
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
			
		sql = "SELECT ts,domain,path FROM URLS WHERE host = '%s' AND path <> '' AND domain IN (%s) %s ORDER BY ts DESC" % (host, ",".join("'{0}'".format(w) for w in domains), timerange)
		
		print sql
		
		result = self.conn.execute(sql)	
		
		
		urls = [{"ts":row[0], "domain":row[1], "path":row[2]} for row in result]
		
		queries = []
	
		for url in urls:
			qstring =url['path'].split(searchsplits[url['domain']])
			if len(qstring) > 1:
				term = qstring[1].split("&")[0]
			 	queries.append(urllib.unquote(term).decode('utf-8')) 
		
		return queries

	def fetch_urls_for_host(self, host, fromts=None, tots=None):
		
		timerange = ""
		
		if fromts and tots:
			timerange = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
		
		sql = "SELECT ts,host,domain FROM URLS WHERE host = '%s' %s ORDER BY ts DESC" % (host,timerange)
		
		result = self.conn.execute(sql)
		urls = [{"ts":row[0], "url":row[2]} for row in result]

		return urls
	
	def fetch_urls_for_tagging(self, host, fromts=None, tots=None):
		timerange = ""
		
		if fromts and tots:
			timerange = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
		
		sql = "SELECT DISTINCT(domain), COUNT(domain) as requests FROM URLS WHERE host = '%s' %s GROUP BY domain ORDER BY requests DESC" % (host,timerange)
		
		result = self.conn.execute(sql)
		urls = [{"domain":row[0], "requests":row[1]} for row in result]
		
		return urls
	
	def fetch_zones_for_host(self, host, fromts=None, tots=None):
		
		timerange = ""
		
# 		if fromts and tots:
#  			timerange = "AND (enter >= %s AND exit <= %s)" % (fromts, tots)
		
		sql = "SELECT name,enter,exit FROM ZONES WHERE host = '%s' %s ORDER BY enter DESC" % (host,timerange)
		
		result = self.conn.execute(sql)
		zones = [{"name":row[0], "enter":row[1], "exit":row[2]} for row in result]

		return zones		
	
	def fetch_tags_for_host(self, host, fromts=None, tots=None):
		
		timerange=""
		
		if fromts and tots:
			timerange = "AND (u.ts >= %s AND u.ts < %s)" % (fromts, tots)
			
		sql = "SELECT t.tag, u.ts FROM TAGS t, URLS u WHERE u.host='%s' %s AND t.domain = u.domain" % (host, timerange)
		result = self.conn.execute(sql)
		activity = [{"tag":row[0], "ts":row[1]} for row in result]
		return activity
	
	def fetch_tags(self):
		sql = "SELECT tag FROM TAG"
		result = self.conn.execute(sql)
		tags = [row[0] for row in result]
		tags.sort()
		return tags
		
	def fetch_top_urls_for_host(self, host, limit=10, fromts=None, tots=None):
		timerange = ""
		
		if fromts and tots:
			timerange = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
		
		sql = "SELECT DISTINCT(domain), count(domain) AS requests FROM URLS WHERE host = '%s' %s GROUP BY domain ORDER BY requests DESC LIMIT %d" % (host, timerange, limit)
		
	
		result = self.conn.execute(sql)
		urls = [{"domain":row[0], "requests":row[1]} for row in result]
		
		return urls
	
	def fetch_domain_requests_for_host(self, host,domain,fromts, tots):
		timerange = ""
		
		if fromts and tots:
			timerange = "AND (ts >= %s AND ts < %s)" % (fromts, tots)
		
		sql = "SELECT ts FROM URLS WHERE host = '%s' AND domain = '%s' %s ORDER BY ts DESC" % (host,domain,timerange)
		
		print sql
		
		result = self.conn.execute(sql)
		requests = [row[0] for row in result]
		return requests
	
	def insert_tag_for_host(self, host,domain,tag):
		print "inserting %s %s %s" % (host,domain,tag)
		self.conn.execute("INSERT INTO TAGS(host,domain,tag) VALUES (?,?,?)", (host,domain,tag))
		self.conn.commit()
	
	def insert_tag(self,tag):
		self.conn.execute("INSERT INTO TAG(tag) VALUES('%s')" % tag)
		self.conn.commit()
	
	def insert_process(self, process):
		if self.connected is not True:
			self.connect()
		
		self.conn.execute("INSERT INTO PROCESSES(ts,host,name,starttime) VALUES(?,?,?,?)", (process['ts'],process['host'], process['name'], process['starttime']))
		self.conn.commit()
						
	def insert_url(self, url):
		if self.connected is not True:
			self.connect()

		self.conn.execute("INSERT INTO URLS(ts, host, domain, path) VALUES(?,?,?,?)", (url['ts'], url['host'], url['domain'], url['path']))
		self.conn.commit()
	
	def insert_zone(self,zone):
		if self.connected is not True:
			self.connect()
		self.conn.execute("INSERT INTO ZONES(host, name, enter, exit) VALUES(?,?,?,?)", (zone['host'], zone['name'], zone['enter'], zone['exit']))
		self.conn.commit()
			
	def createTables(self):
		if self.connected is not True:
			self.connect()
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS URLS
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			ts INTEGER,
			host CHAR(16),
			domain CHAR(255),
			path TEXT);''')
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS ZONES
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			host CHAR(16),
			name  CHAR(128),
			enter INTEGER,
			exit INTEGER);''')
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS PROCESSES
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			ts INTEGER,
			host CHAR(16),
			name  CHAR(128),
			starttime INTEGER,
			UNIQUE(ts, name) ON CONFLICT IGNORE);''')
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS TAGS
			(host CHAR(16),
			domain CHAR(128),
			tag  CHAR(128),
			UNIQUE(host, domain) ON CONFLICT REPLACE);''')		
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS TAG
			(tag CHAR(128) PRIMARY KEY);''')
			
		log.debug("created tables successfully!")
		
	
