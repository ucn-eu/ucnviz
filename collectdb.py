import sqlite3
import logging

log = logging.getLogger( "collect_logger" )
class CollectDB(object):
	
	def __init__( self, name):
		self.name = name
		self.connected = False
		
	def connect(self):
		log.debug( "connecting to sqllite database %s" % self.name )
		if self.connected is False:
			self.conn = sqlite3.connect("%s" % self.name, check_same_thread = False)
			self.connected = True	
			
	def insert_token_for_host(self, api, host, token):
		if self.connected is not True:
			self.connect()
		try:
			self.conn.execute("INSERT INTO TOKENS(api, host, token) VALUES(?,?,?)", (api, host, token))
			self.conn.commit()
		except Exception, e:
			log.error("error saving token!!")
			log.error(e);
	
	def insert_calendar_token_for_user(self, username, token):
		
		if self.connected is not True:
			self.connect()
		try:
			self.conn.execute("INSERT INTO CALENDARTOKENS(username, token) VALUES(?,?)", (username, token))
			self.conn.commit()
		except Exception, e:
			log.error("error saving calendar token!!")
			log.error(e);		
	
	def fetch_calendar_tokens(self):
		if self.connected is not True:
			self.connect()
		sql = "SELECT token, username, lastUpdate, attr FROM CALENDARTOKENS"
		result = self.conn.execute(sql)
		return [{"token":row[0], "username":row[1], "lastUpdate":row[2], "attr":row[3]} for row in result]
	
	def update_calendar_id(self, username, calendarId):
		result = self.conn.execute("UPDATE CALENDARTOKENS SET attr='%s' WHERE username = '%s'" % (calendarId, username))
		self.conn.commit()
		return result
					
	def fetch_tokens(self, api):
		if self.connected is not True:
			self.connect()
		sql = "SELECT token, host, lastUpdate, attr FROM TOKENS WHERE api = '%s'" % api
		result = self.conn.execute(sql)
		
		return [{"token":row[0], "host":row[1], "lastUpdate":row[2], "attr":row[3]} for row in result]
		
	def fetch_token_for_host(self, api, host):
		if self.connected is not True:
			self.connect()
		result = self.conn.execute("SELECT token FROM TOKENS WHERE host = '%s' AND api ='%s'" % (host,api))
		token = result.fetchone()
		if token:
			return token[0]
		else:
			return None
	
	def update_ts(self, api, host, ts):
		if self.connected is not True:
			self.connect()	
		
		result = self.conn.execute("UPDATE TOKENS SET lastUpdate='%s' WHERE host = '%s' AND api='%s'" % (ts, host,api))
		self.conn.commit()
		return result
	
	def update_filepos(self, ts, fpos, type):
		if self.connected is not True:
			self.connect()	
		
		result = self.conn.execute("INSERT OR REPLACE INTO LOGACCESS(name, ts, filepos) VALUES (?,?,?)", (type, ts, fpos))
		self.conn.commit()
		return result
	
	def fetch_filepos_for(self, type):
		result = self.conn.execute("SELECT filepos FROM LOGACCESS WHERE name=(?)", (type,))
		fpos = result.fetchone()
		if fpos is not None:
			return fpos[0]
		return 0
	
	
				
	def createTables(self):
		if self.connected is not True:
			self.connect()
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS TOKENS
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			api CHAR(255),
			host CHAR(16),
			token CHAR(255),
			attr CHAR(255),
			lastUpdate CHAR(32),
			UNIQUE(host,api) ON CONFLICT REPLACE);''')	
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS CALENDARTOKENS
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			username CHAR(128),
			token CHAR(255),
			attr CHAR(255),
			lastUpdate CHAR(32),
			UNIQUE(username,token) ON CONFLICT REPLACE);''')	
			
		self.conn.execute('''CREATE TABLE IF NOT EXISTS LOGACCESS
			(name PRIMARY KEY,
			ts INTEGER,
			filepos INTEGER);''')
				
		self.conn.commit()
