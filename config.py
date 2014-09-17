class Config(object):
	CLIENT_ID		= "T5LdxDC8QtZQUH9zi8p_u2h41lqxs45U" 
	CLIENT_SECRET 	= "VB77mfS3g7oAl1aqOG81ci0qtrOUUzDY7S7hCQPMQOy2J50ccVz3yt2RyycGA9zK"
	REDIRECT_URL  	= "http://54.195.252.247/moves/callback"
	OAUTH_URL		=  "https://api.moves-app.com/oauth/v1"
	API_URL 		= "https://api.moves-app.com/api/1.1"
	LOGFILE 		= "/var/tmp/ucn.log"
	CIDR			= "10.8.0.0/24"
	OPENVPN_STATUS  = "/etc/openvpn/openvpn-status.log"
	
class TestingConfig(Config):
	pass
