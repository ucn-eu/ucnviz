from netaddr import IPNetwork, IPAddress
import logging
from pymongo import MongoClient

logger = logging.getLogger( "ucn_logger" )

class VPNResolve(object):

	def __init__( self, cidr, dbcfg):
		self.mongocollection = dbcfg['collection']
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
			host = self.findlocal(host) or host
	
		return host

	def findlocal(self, host):
		db = self.mc[self.db]
		device = db[self.mongocollection].find_one({"untrusted_client_ip": host}, sort=[('$natural', -1)])
		
		if device is not None:
			if 'ifconfig_local' in device:
				logger.debug("retreived ip %s" %  device['ifconfig_local'])
				return device['ifconfig_local']	
		logger.debug("no corresponding ip for %s in db" % host)
		return None
		
# 		openvpnstatus = open(self.statusfile)
# 		for line in openvpnstatus:
# 			columns = line.split(",")
# 			try:
# 				IPAddress(columns[0]) #throw exception if not valid IP..
# 				external = columns[2].split(":")[0]
# 				IPAddress(external) #throw exception if not valid IP..
# 				logger.debug("checking %s against %s" % (external, host))
# 				if external == host:
# 					return columns[0]
# 			except:
# 				pass
# 		return None
	