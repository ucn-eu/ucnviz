require.config({
        baseUrl: '/static/js/my',
        paths:{
          "knockout" : "../knockout/knockout-3.1.0",
          "jquery" : "../jquery/jquery-2.1.0.min",
	  	  "foundation" : "../foundation/foundation.min",
	  	   'moment': '../moment/moment.min',
	  	  "d3":"../d3/d3.min",
	  	  "nvd3":"../d3/nv.d3",
        },
        
        shim: {
        	"foundation" : ["jquery"],
        	"nvd3":["d3"],
    	}
})

require(['knockout', 'ajaxservice', 'moment','overview'], function(ko, ajaxservice, moment, overview) {
    //'/overview/activity'
    ajaxservice.ajaxGetJson('/overview/activity', {home:'lodges'}, function(data){
    	
		//need to massage data ensure all is the same
		//create a list of all timestamps
		/*var start = performance.now();//new Date().getTime();
		
		var mydata = data.activity;
		var timestamps = [];
		
		for (i = 0; i < mydata.length; i++){
			for (j = 0; j < mydata[i].values.length; j++){
				mydata[i].values[j][0] = moment(mydata[i].values[j][0]).unix();
				if (timestamps.indexOf(mydata[i].values[j][0]) == -1)
					timestamps.push(mydata[i].values[j][0]);		
			}
		}
		
		for (i = 0; i < mydata.length; i++){
			var key  = mydata[i].key;
			var tses = mydata[i].values.map(function(item){return item[0]});
			for (j = 0; j < timestamps.length; j++){
				if (tses.indexOf(timestamps[j]) == -1){
					mydata[i].values.push([timestamps[j], 0]);
				}
				mydata[i].values.sort(function(a,b){return a[0] < b[0] ? -1 : 1;});
			}
		}
		var end = performance.now();// new Date().getTime();
		
		console.log("took " + (end-start) + " ms to massage and sort data");
		
		*/
		overview.init(data);
	
	});
});