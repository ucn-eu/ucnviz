from config import TestingConfig
from datadb import NetDB

if __name__ == "__main__":
	cfg = TestingConfig()
	datadb = NetDB(name=cfg.DATADB)
	datadb.copy_across("../backup/netdata.db")