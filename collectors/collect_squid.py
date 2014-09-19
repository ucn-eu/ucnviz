from datadb import NetDB
from collectdb import CollectDB
from os import path
import logging
from datetime import datetime
import time
from config import TestingConfig

logger = logging.getLogger( "collect_logger" )

def insert_urls(datafile):
	
	fpos = collectdb.fetch_filepos_for('squid')
	
	if fpos < path.getsize(datafile):
		with open(datafile) as f:
			f.seek(fpos)
			content = f.readlines()
			datadb.bulk_insert_urls(content)
			collectdb.update_squid(int(time.mktime(datetime.now().timetuple())), f.tell()+1)
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
	datadb = NetDB(name=cfg.DATADB)
	insert_urls(cfg.SQUIDLOG)