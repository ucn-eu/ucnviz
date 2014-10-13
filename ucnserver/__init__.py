from flask import Flask, render_template, jsonify, request
from pymongo import MongoClient
from datadb import NetDB
from collectdb import CollectDB

import config
import logging
import redis

from viz import viz_api
from moves import moves_api
from ios import ios_api
from admin import admin_api

app = Flask(__name__)
app.config.from_object(config.TestingConfig)

#set up the logger
logger = logging.getLogger( "ucn_logger" )
hdlr = logging.FileHandler(app.config["LOGFILE"] or '/var/tmp/ucn.log') 
formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
hdlr.setFormatter(formatter)
logger.addHandler(hdlr)
logger.setLevel(logging.DEBUG)

#register blueprints (additional routes)
app.register_blueprint(viz_api)
app.register_blueprint(moves_api)
app.register_blueprint(ios_api)
app.register_blueprint(admin_api)

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

	
app.config["datadb"]     	= datadb 
app.config["collectdb"]  	= collectdb 
app.config["blocked"]    	= blocked	
app.config["background"] 	= background
app.config["mongoclient"]	= MongoClient(app.config["MONGOHOST"], int(app.config["MONGOPORT"]))	
app.config["base_url"]		= app.config["BASEURL"]
app.config["redis"]			= redis.Redis('127.0.0.1')