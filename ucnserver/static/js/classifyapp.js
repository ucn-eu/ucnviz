require.config({
        baseUrl: '/static/js/my',
        paths:{
	  	    "d3":"../d3/d3.min",
          "jquery" : "../jquery/jquery-2.1.0.min",
        }
});

require(['modules/classify'], function(classify) {
    
    classify.init();
});
