from datadb import NetDB
from collectdb import CollectDB
from os import path
import logging
from datetime import datetime
import time
from config import TestingConfig

logger = logging.getLogger( "collect_logger" )

def insert_urls(datafile):
	if path.isfile(datafile) is False:
		logger.debug("no access.log, trying date suffix %s-%s" % (datafile, time.strftime("%Y%m%d")))
		datafile =  "%s-%s" % (datafile, time.strftime("%Y%m%d"))
		if path.isfile(datafile) is False:
			return
	

	logger.debug("adding data from squid logs")	
	fpos = collectdb.fetch_filepos_for('squid')
	
	if fpos > path.getsize(datafile):
		logger.debug("resetting fpos to 0 (%d > %d)" % ((fpos+1), path.getsize(datafile)))
		fpos = 0

	logger.debug("reading from file position %d, squid file size is %d" % (fpos,path.getsize(datafile)))
		
	if fpos < path.getsize(datafile):
		with open(datafile) as f:
			f.seek(fpos)
			content = f.readlines()
			logger.debug("adding %d new entries" % len(content))
			#logger.debug("%s" % content)
			datadb.bulk_insert_urls(content)
			collectdb.update_filepos(int(time.mktime(datetime.now().timetuple())), f.tell(),'squid')	
			logger.debug("written %d bytes of squid log to db" % (f.tell() - fpos))	

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
	insert_urls(cfg.SQUIDLOG)
