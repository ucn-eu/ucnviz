from flask import Flask, render_template, jsonify, request

from datadb import NetDB
from collectdb import CollectDB

import config
import logging

from viz import viz_api
from moves import moves_api
from ios import ios_api

app = Flask(__name__)
app.config.from_object(config.TestingConfig)
blocked = []
background = []

logger.debug("started up")	

with open("ad_domains.txt") as f:
	blocked = [x.strip() for x in f.readlines()]
	
with open("backgroundapps.txt") as f:
	background = [x.strip() for x in f.readlines()]
        
collectdb = CollectDB(name=app.config["COLLECTDB"])
collectdb.createTables()

datadb = NetDB(name=app.config["DATADB"])
datadb.createTables()	
	
app.config["datadb"]     = datadb 
app.config["collectdb"]  = collectdb 
app.config["blocked"]    = blocked	
app.config["background"] = background
	
#set up the logger
logger = logging.getLogger( "ucn_logger" )
hdlr = logging.FileHandler(app.config["LOGFILE"] or '/var/tmp/ucn.log') 
formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
hdlr.setFormatter(formatter)
logger.addHandler(hdlr)
logger.setLevel(logging.DEBUG)
app.config["logger"] = logger

#register blueprints (additional routes)
app.register_blueprint(viz_api)
app.register_blueprint(moves_api)
app.register_blueprint(ios_api)

@app.route("/")
def root():
	return render_template('overview.html')
		
if __name__ == "__main__":	
	app.run(debug=True, host='0.0.0.0', port=8000)
