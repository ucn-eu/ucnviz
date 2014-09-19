from ucnserver import app
#@app.route("/")
#def root():
#	return render_template('overview.html')
		
#if __name__ == "__main__":	
app.run(debug=True, host='0.0.0.0', port=8000)
