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
        	"kendo"		: ['jquery'],
        	'knockout-kendo':['kendo'],
        	"gmapsDone"  : ["jquery"],
        	"gmaps"      : ["jquery"],
        	"flot"		 : ["jquery"],
        	"flottime"	 : ["flot"],
        	"flotselection": ["flot"],
        	"flotsymbol": ["flot"]
    	}
})

//'async!https://maps.google.com/maps/api/js?v=3&libraries=drawing&sensor=false'
require(['modules/bootstrap','jquery', 'modules/calendar', 'modules/colours', 'modules/overlays', 'modules/overview', 'modules/web', 'modules/tagger', 'modules/tags', 'knockout', 'ajaxservice'], function(bootstrap, $, calendar,cf,overlays, overview,web, tagger, tags, ko, ajaxservice) {
  	//console.log(requirejs.s.contexts._.config);
  	
  	bootstrap.init();
  	
  	ajaxservice.ajaxGetJson('overview/activity', {home:'lodges'}, function(data){
		
		cf.init(data.hosts);
		web.init(cf);
		
		if (data.keys){
			calendar.init(new Date(data.keys.reduce(function(a,b){return Math.max(a,b)}) * 1000));
		}else{
			calendar.init(null);
		}
		
		overview.init(data, cf);
		overlays.init(data.zones, data.apps);
		ko.applyBindings(overview, $("#overall")[0]);
		
		ajaxservice.ajaxGetJson('web/bootstrap', {home:'lodges'}, function(data){
			tags.init(cf);
			tagger.init();
			
			ko.applyBindings(calendar, $("#calendar")[0]);
			//ko.applyBindings(web, $("#web")[0]);
			ko.applyBindings(tagger, $("#tagger")[0]);
			ko.applyBindings(tags, $("#tags")[0]);
			ko.applyBindings(overlays, $("#overlays")[0]);
		 	$('.main').css('display','block');
		});
	});
});
