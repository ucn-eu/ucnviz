class Config(object):

	#tld that ucn is serving from
	BASEURL	="https://horizab4.memset.net"
	
	#--------------- moves config -----------------
	
	#the moves app client id
	CLIENT_ID		= "A CLIENT ID" 
	
	#the moves app client secret
	CLIENT_SECRET 	= "A CLIENT SECRET"
	
	#the moves oauth callback url
	REDIRECT_URL  	= "/moves/callback"
	
	#the moves oauth url
	OAUTH_URL		=  "https://api.moves-app.com/oauth/v1"
	
	#the moves api url
	API_URL 		= "https://api.moves-app.com/api/1.1"
	
	#----config for mapping openvpn IPs to external ----
	
	#the CIDR of the IPs handed out by openvpn
	CIDR			= "10.8.0.0/24"
	
	#the openvpn log that keeps the traslation of local (vpn) IP to external IP 
	OPENVPN_STATUS  = "/etc/openvpn/openvpn-status.log"

	
	#------------------ databases  ----------------------
	
	#the db holding the moves oauth tokens 
	COLLECTDB		= "collect.db"
	
	#the db for the viz - process data, squid data, hosts
	DATADB			= "netdata.db"

	#the mongodb that contains user and device details
	MONGOHOST 	= "127.0.0.1"
	MONGOPORT 	= 27017
	MONGODB 	= "ucnexp"
	
	#mongodb collections (db tables)
	USERCOLLECTION 		= "users"
	DEVICECOLLECTION	= "devices"
	VPNLOGSCOLLECTION	= "vpn_server_logs"
	
	#the redis server that contains the session details
	REDISHOST	= "127.0.0.1"
	
	#---------------- logging stuff ----------------------
	#the collector (squid/moves) log file
	COLLECT_LOGFILE = "/var/tmp/collect.log"
	
	#the main log file
	LOGFILE 		= "/var/tmp/ucn.log"
	
	#---------------- data files ----------------------
	
	SQUIDLOG		= "/usr/local/squid/var/logs/access.log"
	DNSLOG			= "/var/tmp/dns.log"
	
class TestingConfig(Config):
	pass
