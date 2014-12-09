require.config({
        baseUrl: '/static/js/my',
        paths:{
          "knockout" : "../knockout/knockout-3.1.0",
          "knockoutpb": "../knockout/knockout-postbox",
          "knockout-bootstrap": "../knockout/knockout-bootstrap.min",
          "kendo":"../kendo/kendo.ui.core.min",
          "knockout-kendo": "../knockout/knockout-kendo",
          "jquery" : "../jquery/jquery-2.1.0.min",
	  	  "modernizr" : "../modernizr/modernizr.min",
	  	  "bootstrap":'../../bootstrap/js/bootstrap.min',
	  	  "d3":"../d3/d3.min",
	  	  "d3.tip":"../d3/d3.tip",
	  	  'moment': '../moment/moment.min',
		  'underscore': '../underscore/underscore.min',
		  'bean':'../flotr2/lib/bean',
		  'flotr': '../flotr2/flotr2-amd',
        },
        
        shim: {
        	"knockout"	: ['jquery'],
        	"knockout-bootstrap": ["jquery"],
        	"bootstrap" : ['jquery'],
        	"kendo"		: ['jquery'],
        	'knockout-kendo':['kendo']
    	}
})

//'async!https://maps.google.com/maps/api/js?v=3&libraries=drawing&sensor=false'
require(['modules/bootstrap'], function(bootstrap) {
  	//console.log(requirejs.s.contexts._.config);
  	
  	bootstrap.init();
  	
});
