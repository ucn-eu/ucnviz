from flask import current_app, Blueprint, render_template, request, redirect
import logging
import urllib
import json
import redis
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.code import Code

admin_api = Blueprint('admin_api', __name__)
logger = logging.getLogger( "ucn_logger" )

def adminloggedin(fn):
	""" decorator to check if user is logged in and redirect if not """
	def wrapped(*args, **kwargs):
		if 'connect.sid' not in request.cookies:
			return redirect("%s/ucn" % current_app.config["BASEURL"])

		cookie = urllib.unquote(request.cookies['connect.sid'])
	
		sessionid = "sess:%s" % cookie[2:].split(".")[0]
	
		user = json.loads(current_app.config["redis"].get(sessionid))
	
		if "passport" not in user:
			return redirect("%s/ucn" %  current_app.config["BASEURL"])
		
		if "user" not in user['passport']:
			return redirect("%s/ucn" %  current_app.config["BASEURL"])
	
		db = current_app.config["mongoclient"][current_app.config["MONGODB"]]

		myuser = db[current_app.config["USERCOLLECTION"]].find_one({"_id": ObjectId(user['passport']['user'])})
		print myuser
		
		if myuser is None:
			return redirect("%s/ucn" %  current_app.config["BASEURL"])
		if myuser['isadmin'] is True:
			return redirect("%s/web" % current_app.config["BASEURL"])
			
		return fn(*args, **kwargs)
	
	return wrapped

@admin_api.route("/admin", methods=['GET'])
@adminloggedin
def admin():	

	db = current_app.config["mongoclient"][current_app.config["MONGODB"]]

	families = db[current_app.config["USERCOLLECTION"]].distinct('familyname')
	
	familylist = []
	
	for family in families:
		users = []
		devices = []
		usernames = db[current_app.config["USERCOLLECTION"]].find({"familyname":family})
		for user in usernames:
			users.append(user['username'])
			dresult = db[current_app.config["DEVICECOLLECTION"]].find({"username":user['username']})
			for device in dresult:
				devices.append(device['vpn_udp_ip'])
		familylist.append({'name':family, 'devices':devices, 'users':users})	
			
	# mapper = Code("""
# 					function(){
# 						emit(this.familyname, this.username)	
# 					}
# 					""")
# 	
# 	reducer = Code("""
# 					function(key, values){
# 						hlist = "";
# 						for (var i = 0; i < values.length; i++){
# 							hlist = hlist + " " + values[i]
# 						}
# 						return hlist
# 					}
# 					""")
# 	
# 	result = db[current_app.config["USERCOLLECTION"]].map_reduce(mapper, reducer, "myresults")
# 	
# 	for doc in result.find():
# 		print doc
		
	return render_template('admin.html', families=familylist)
	
	
