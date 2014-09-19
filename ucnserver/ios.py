from flask import current_app, Blueprint,request, jsonify
from vpnresolve import VPNResolve
import json
import logging

ios_api = Blueprint('ios_api', __name__)

logger = logging.getLogger( "ucn_logger" )

@ios_api.route("/log", methods=['POST'])
def log():
	
	vpnres = VPNResolve(current_app.config["CIDR"], current_app.config["OPENVPN_STATUS"])
	host = vpnres.clientip(request)
	logger.debug("saving ios data for host %s", host)
	
	data = request.get_json(force=False)
	
	current_app.config["logger"].debug("received data for host %s" % host)
	
	#shove the processes into the table in bulk!
	success= True
	
	if 'processes' in data:
		logger.debug("saving ios process data for host %s", host)
		success = current_app.config["datadb"].bulk_insert_processes(host,data['processes'])
		if success:
			logger.debug("sucessfully saved ios process data for host %s", host)
		else:
			logger.error("failed to save ios process data")
			
	if 'network' in data:
		logger.debug("saving ios network for host %s", host)
		success = success and current_app.config["datadb"].insert_network_data(host, data['network'])
		if success:
			logger.debug("sucessfully saved ios network data for host %s", host)
		else:
			logger.error("failed to save ios network data")
			logger.error(data['network'])
		
	return jsonify(success=success)
