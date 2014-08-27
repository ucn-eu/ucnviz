require.config({
        baseUrl: '/static/js/my',
        paths:{
          "knockout" : "../knockout/knockout-3.1.0",
          "jquery" : "../jquery/jquery-2.1.0.min",
	  	  "modernizr" : "../modernizr/modernizr.min",
	  	  "foundation" : "../foundation/foundation.min",
	  	  "d3":"../d3/d3.min",
	  	  "async": '../require/lib/async',
	  	  'moment': '../moment/moment.min',
		  'underscore': '../underscore/underscore.min',
		  'bean':'../flotr2/lib/bean',
		  'flotr': '../flotr2/flotr2-amd',
		  'flot': '../flot/jquery.flot',
		  'flottime': '../flot/jquery.flot.time',
		  'flotselection': '../flot/jquery.flot.selection.min',
		  'flotsymbol': '../flot/jquery.flot.symbol.min'
        },
        
        shim: {
        	"foundation" : ["jquery"],
        	"gmapsDone"  : ["jquery"],
        	"gmaps"      : ["jquery"],
        	"flot"		 : ["jquery"],
        	"flottime"	 : ["flot"],
        	"flotselection": ["flot"],
        	"flotsymbol": ["flot"]
    	}
})

//'async!https://maps.google.com/maps/api/js?v=3&libraries=drawing&sensor=false'
require(['webgraph2', 'knockout', 'ajaxservice', 'modernizr', 'foundation'], function(webgraph2, ko, ajaxservice) {
    //graph.init();
    //webgraph.init();
    ajaxservice.ajaxGetJson('web/bootstrap', {}, function(data){
		webgraph2.init(data.hosts, data.tags);
		ko.applyBindings(webgraph2, $("#visualisation")[0]);
	});
});
