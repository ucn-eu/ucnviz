from netaddr import IPNetwork, IPAddress

class VPNResolve(object):

	def __init__( self, cidr, statusfile):
		self.statusfile = statusfile
		self.cidr = cidr
		
	def clientip(self, request):
		if len(request.access_route) > 1:
			host = request.access_route[-1]
		else:
			host = request.access_route[0]

		if IPAddress(host) not in IPNetwork(self.cidr):
			host = self.findlocal(host) or host
	
		return host

	def findlocal(self, host):
	
		openvpnstatus = open(self.statusfile)
		for line in openvpnstatus:
			columns = line.split(",")
			try:
				IPAddress(columns[0]) #throw exception if not valid IP..
				external = columns[2].split(":")[0]
				IPAddress(external) #throw exception if not valid IP..
				if external == host:
					return columns[0]
			except:
				pass
		return None
	