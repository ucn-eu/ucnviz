from datadb import NetDB
from os import listdir
from os.path import isfile, isdir, join
import logging
import sys
import json
from datetime import datetime
import time
from tld import get_tld

def read(type, datafile=None):

	if type == "urls":
		insert_urls(datafile)
	
	if type == "homes":
		insert_homes(datafile)
		
	if type == "zones":
		insert_zones(datafile)
		
	if type == "iphone_processes":
		insert_iphone_processes(datafile)
	
	if type == "iphone_data":
		insert_iphone_data(datafile)
		
	if type=="tags":
		insert_tags(["research", "work", "gaming", "finance", "family", "video streaming", "shopping", "health", "social", "hobby", "news", "entertainment"])

def insert_tags(tags):
	for tag in tags:
		netdb.insert_tag(tag)

def insert_iphone_data(datafile):
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
				netdata = item['network']
				netdb.insert_network_data({'ts':ts, 'host':device, 'wifiup':netdata['wifiup'], 'wifidown':netdata['wifidown'], 'cellup':netdata['cellup'], 'celldown':netdata['celldown']})	
	
def insert_iphone_processes(datafile):
	netdb.bulk_insert_processes_from_file(datafile)

def insert_zones(datafile):
	datafiles = [f for f in listdir(datafile) if isfile(join(datafile,f))]
	
	for f in datafiles:
		
		json_data=open(join(datafile,f))
		myjson = json.load(json_data)
	
 		for reading in myjson:
 			netdb.insert_zone(reading)


def insert_urls(datafile):
	with open(datafile) as f:
		content = f.readlines()
	netdb.bulk_insert_urls(content)
	

def insert_homes(datafile):
	with open(datafile) as f:
		content = f.readlines()
	
	for line in content:
		items = line.split()
		host = {'house':items[1], 'host':items[0]}
		netdb.add_host_to_house(host)
			
if __name__ == '__main__' :
	#create logger
	logger = logging.getLogger("console_log")
	logger.setLevel(logging.DEBUG)
	
	#create console logger and set to debug
	ch = logging.StreamHandler()
	ch.setLevel(logging.DEBUG)
	
	#create formatter
	formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
	
	#add formatter to ch
	ch.setFormatter(formatter)
	
	#add ch to logger
	logger.addHandler(ch)
	
# 	if len(sys.argv) == 3
# 		if sys.argv[1] == "createTables":
# 			netdb = NetDB(name=sys.argv[2])
# 			netdb.createTables()
# 		exit(1)
	
	if len(sys.argv) < 3:
		print "python import.py type dbname [datafile]"
		exit(1)
	
	
	type 	= sys.argv[1]
	dbname 	= sys.argv[2]
	datafile = None
	
	if len(sys.argv) == 4:
		datafile = sys.argv[3] 
	
	netdb = NetDB(name=dbname)
	netdb.createTables()
	
	read(type, datafile) 

	
