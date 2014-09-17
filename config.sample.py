class Config(object):
	CLIENT_ID	= "moves-app client id" 
	CLIENT_SECRET 	= "moves-app client secret"
	REDIRECT_URL  	= "http://54.195.252.247/moves/callback"
	OAUTH_URL	=  "https://api.moves-app.com/oauth/v1"
	API_URL 	= "https://api.moves-app.com/api/1.1"
	LOGFILE 	= "/var/tmp/ucn.log"
	CIDR		= "10.8.0.0/24"
	OPENVPN_STATUS  = "/etc/openvpn/openvpn-status.log"
	
class TestingConfig(Config):
	pass
