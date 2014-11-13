from datadb import NetDB
from collectdb import CollectDB
from os import path
import logging
from datetime import datetime
import time
from config import TestingConfig

logger = logging.getLogger( "collect_logger" )

def insert_dns(datafile):
	
	logger.debug("adding data from dns logs")	
	fpos = collectdb.fetch_filepos_for('dns')
	
	if fpos > path.getsize(datafile):
		logger.debug("resetting fpos to 0 (%d > %d)" % ((fpos+1), path.getsize(datafile)))
		fpos = 0

	logger.debug("reading from file position %d, dns file size is %d" % (fpos,path.getsize(datafile)))
		
	if fpos < path.getsize(datafile):
		with open(datafile) as f:
			f.seek(fpos)
			content = f.readlines()
			lines = []
			for line in content:
				tokens = line.split()
				ts = tokens[0].split(".")[0]
				host = ".".join(tokens[1].split(".")[:4])
				domain = tokens[2][:-1]
				lines.append({'ts':ts,'host':host,"domain":domain})
		
			logger.debug("adding %d new entries" % len(lines))
			
			datadb.bulk_insert_dns(lines)
			collectdb.update_filepos(int(time.mktime(datetime.now().timetuple())), f.tell(),'dns')	
			logger.debug("written %d bytes of dns log to db" % (f.tell() - fpos))	

if __name__ == "__main__":
	cfg = TestingConfig()
	hdlr = logging.FileHandler(cfg.COLLECT_LOGFILE or '/var/tmp/collect.log') 
	formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
	hdlr.setFormatter(formatter)
	logger.addHandler(hdlr)
	logger.setLevel(logging.DEBUG)

	collectdb = CollectDB(name=cfg.COLLECTDB)
	collectdb.createTables()
	logger.debug("using dbase %s" % cfg.DATADB)
	datadb = NetDB(name=cfg.DATADB)
	insert_dns(cfg.DNSLOG)
