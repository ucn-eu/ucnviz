from flask import current_app, Blueprint,request, jsonify
from vpnresolve import VPNResolve
import json
import os
import datetime
from datetime import date

ios_api = Blueprint('ios_api', __name__)

@ios_api.route("/log", methods=['POST'])
def log():
	vpnres = VPNResolve(current_app.config["CIDR"], current_app.config["OPENVPN_STATUS"])
	host = vpnres.clientip(request)
	
	data = request.get_json(force=False)
	datestr = datetime.datetime.now().strftime("%d-%m-%y_%H:%M:%S") 
	
	current_app.config["logger"].debug("received data for host %s" % host)
	
	try:
		strdata = "%s" % json.dumps(data)
		directory = "/var/log/netdata/%s" % (host)

		if not os.path.exists(directory):
			current_app.config["logger"].debug("creating new dir %s" % directory)
			os.makedirs(directory)

		with open("%s/%s.txt" % (directory, datestr), "w") as logfile:
			logfile.write(strdata)	
			current_app.config["logger"].debug("written to %s/%s.txt" % (directory, datestr))
			return jsonify(success=True)
	
	except Exception as e:
		current_app.config["logger"].error("exception writing data %s" % str(e))
		return jsonify(success=False, error=str(e))

	return jsonify(success=False)
