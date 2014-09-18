class Config(object):

	#--------------- moves config -----------------
	
	#the moves app client id
	CLIENT_ID		= "A CLIENT ID" 
	
	#the moves app client secret
	CLIENT_SECRET 	= "A CLIENT SECRET"
	
	#the moves oauth callback url
	REDIRECT_URL  	= "http://54.195.252.247/moves/callback"
	
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

	
	#---------------- logging stuff ----------------------
	#the collector (squid/moves) log file
	COLLECT_LOGFILE = "/var/tmp/collect.log"
	
	#the main log file
	LOGFILE 		= "/var/tmp/ucn.log"
	
	#---------------- data files ----------------------
	
	SQUIDLOG		= "/usr/local/squid/var/logs/access.log"
	
class TestingConfig(Config):
	pass
