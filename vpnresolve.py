from netaddr import IPNetwork, IPAddress
import logging
from pymongo import MongoClient

logger = logging.getLogger( "ucn_logger" )

class VPNResolve(object):

	def __init__( self, cidr, dbcfg):
		self.logscollection = dbcfg['logscollection']
		self.devicecollection = dbcfg['devicecollection']
		self.db = dbcfg['db']
		self.cidr = cidr
		self.mc = MongoClient(dbcfg['host'], dbcfg['port'])
	
	def clientip(self, request):
		
		if len(request.access_route) > 1:
			host = request.access_route[-1]
		else:
			host = request.access_route[0]
		
		logger.debug("seen a client ip %s" % host)
		
		if IPAddress(host) not in IPNetwork(self.cidr):
			logger.debug("is not local, looking up in openvpn status")
			return self.findlocal(host)
		else:
			return host
		

	def findlocal(self, host):
		db = self.mc[self.db]
		devices = db[self.logscollection].find({"untrusted_client_ip": host}).sort("ts", -1).limit(1)
		
		devicename = None
		protocol = None
		for device in devices:
			devicename = device['common_name'] 
			protocol = device['proto']
			
		 
		#now lookup device name in the devices collection
		device = db[self.devicecollection].find_one({"login":devicename})
	
		if device is not None:
			if protocol is not None:
				if protocol == "udp":
					if 'vpn_udp_ip' in device:
						logger.debug("retreived udp ip %s" %  device['vpn_udp_ip'])
						return device['vpn_udp_ip']	
				elif protocol == "tcp":
					if 'vpn_tcp_ip' in device:
						logger.debug("retreived tcp ip %s" %  device['vpn_tcp_ip'])
						return device['vpn_tcp_ip']	
		
		logger.debug("no corresponding ip for %s in db" % host)
		return None