require.config({
        baseUrl: '/static/js/my',
        paths:{
          "knockout" : "../knockout/knockout-3.1.0",
          "jquery" : "../jquery/jquery-2.1.0.min",
	  	  "foundation" : "../foundation/foundation.min",
	  	  "d3":"../d3/d3.min",
        },
        
        shim: {
        	"foundation" : ["jquery"],
    	}
})

require(['knockout', 'ajaxservice', 'activity', 'foundation'], function(ko, ajaxservice, activity) {
    
    //ajaxservice.ajaxGetJson('activitysummary', {}, function(data){
		
	//});
});