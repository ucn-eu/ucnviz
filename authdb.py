import sqlite3
import logging

log = logging.getLogger( "console_log" )

class AuthDB(object):
	
	def __init__( self, name):
		self.name = name
		self.connected = False
		
	def connect(self):
		log.debug( "connecting to sqllite database %s" % self.name )
		if self.connected is False:
			self.conn = sqlite3.connect("%s" % self.name, check_same_thread = False)
			self.connected = True
	
	def insert_token_for_host(self, host, token):
		if self.connected is not True:
			self.connect()
		self.conn.execute("INSERT INTO TOKENS(host, token) VALUES(?,?)", (host, token))
		self.conn.commit()
	
	def fetch_tokens(self):
		if self.connected is not True:
			self.connect()
		sql = "SELECT token, host, lastUpdate FROM TOKENS"
		print sql
		result = self.conn.execute(sql)
		
		return [{"token":row[0], "host":row[1], "lastUpdate":row[2]} for row in result]
		
	def fetch_token_for_host(self, host):
		if self.connected is not True:
			self.connect()
		result = self.conn.execute("SELECT token FROM TOKENS WHERE host = '%s'" % host)
		token = result.fetchone()
		if token:
			return token[0]
		else:
			return None
	
	def update_ts(self, host, ts):
		if self.connected is not True:
			self.connect()	
		
		result = self.conn.execute("UPDATE TOKENS SET lastUpdate='%s' WHERE host = '%s'" % (ts, host))
		self.conn.commit()
		return result
		
	def createTables(self):
		if self.connected is not True:
			self.connect()
		
		self.conn.execute('''CREATE TABLE IF NOT EXISTS TOKENS
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			host CHAR(16),
			token CHAR(255),
			lastUpdate CHAR(32),
			UNIQUE(host) ON CONFLICT REPLACE);''')	
		self.conn.commit()
	