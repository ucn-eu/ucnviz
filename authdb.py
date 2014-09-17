import sqlite3

def reconnect(fn):
	""" decorator to reconnect to the database if needed """
	def wrapped(self, *args, **kwargs):
		if self.connected is not True:
			self.connect()
		return fn(self, *args, **kwargs)
	return wrapped
	
class AuthDB(object):
	
	def __init__( self, name):
		self.name = name
		self.connected = False
		
	def connect(self):
		if self.connected is False:
			self.conn = sqlite3.connect("%s" % self.name, check_same_thread = False)
			self.connected = True
	
	@reconnect
	def insert_token_for_host(self, host, token):
		self.conn.execute("INSERT INTO TOKENS(host, token) VALUES(?,?)", (host, token))
		self.conn.commit()
	
	@reconnect
	def fetch_tokens(self):
		result = self.conn.execute("SELECT token, host FROM TOKENS")
		return [{"token":row[0], "host":row[1]} for row in result]
	
	@reconnect	
	def fetch_token_for_host(self, host):
		result = self.conn.execute("SELECT token FROM TOKENS WHERE host = '%s'" % host)
		token = result.fetchone()
		if token:
			return token[0]
		else:
			return None
	
	@reconnect		
	def createTables(self):
		self.conn.execute('''CREATE TABLE IF NOT EXISTS TOKENS
			(id INTEGER PRIMARY KEY AUTOINCREMENT,
			host CHAR(16),
			token CHAR(255),
			lastUpdate CHAR(32),
			UNIQUE(host) ON CONFLICT REPLACE);''')	
		self.conn.commit()
	