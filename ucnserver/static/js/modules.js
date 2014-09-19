require.config({
        baseUrl: '/static/js/my',
        paths:{
          "knockout" : "../knockout/knockout-3.1.0",
          "knockoutpb": "../knockout/knockout-postbox",
          "knockout-bootstrap": "../knockout/knockout-bootstrap.min",
          "jquery" : "../jquery/jquery-2.1.0.min",
	  	  "modernizr" : "../modernizr/modernizr.min",
	  	  "bootstrap":'../../bootstrap/js/bootstrap.min',
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
        	"knockout"	: ['jquery'],
        	"bootstrap" : ['jquery'],
        	"gmapsDone"  : ["jquery"],
        	"gmaps"      : ["jquery"],
        	"flot"		 : ["jquery"],
        	"flottime"	 : ["flot"],
        	"flotselection": ["flot"],
        	"flotsymbol": ["flot"]
    	}
})

//'async!https://maps.google.com/maps/api/js?v=3&libraries=drawing&sensor=false'
require(['jquery','modules/colours', 'modules/queries', 'modules/overview', 'modules/web', 'modules/tagger', 'modules/tags', 'modules/control', 'knockout', 'ajaxservice'], function($, cf, queries, overview,web, tagger, tags, control, ko, ajaxservice) {
  
  	ajaxservice.ajaxGetJson('overview/activity', {home:'lodges'}, function(data){
		console.log(data.hosts);
		cf.init(data.hosts);
		overview.init(data, cf);
		ko.applyBindings(overview, $("#overall")[0]);
		
		ajaxservice.ajaxGetJson('web/bootstrap', {home:'lodges'}, function(data){
			tags.init(data.tags || [], cf);
			tagger.init(data.tags || []);
			web.init(cf);
		
			ko.applyBindings(web, $("#web")[0]);
			ko.applyBindings(tagger, $("#tagger")[0]);
			ko.applyBindings(tags, $("#tags")[0]);
			ko.applyBindings(control, $("#control")[0]);
			ko.applyBindings(queries, $("#queries")[0]);
		});
	});
});
