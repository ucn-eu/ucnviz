define(['module', 'jquery', 'modules/calendar', 'modules/colours', 'modules/overlays', 'modules/overview', 'modules/tagger', 'modules/tags', 'modules/timespan', 'knockout', 'ajaxservice'], function(module, $, calendar,cf,overlays, overview, tagger, tags, timespan, ko, ajaxservice) {
   
    var 
    	family,
    	
    	update = function(current, selected){
    		
    	
    		var newmin, newmax;
    		
    		currentmindate = current[0];
    		currentmaxdate = current[1];
    		
    		if (selected.fromts < currentmindate){
    			newmin	   = selected.fromts;
    			newmax	   = newmin + 60*60*24*7;
    		}else{
    			newmax 	   = selected.tots;
    			newmin     = newmax - 60*60*24*7;
    		}
    		
    		ajaxservice.ajaxGetJson('overview/activity', {family:family, fromts:newmin, tots:newmax}, function(data){
    			cf.init(data.hosts);
    			overview.init(data);
    			overlays.init(data.zones, data.apps);
    		});
    	},
    	
    	init = function(){
    	 	//this is passed in through require.js (see browsing.html)
    	 	family = module.config().family;
    		
    		ajaxservice.ajaxGetJson('overview/activity', {family:family}, function(data){
				
				cf.init(data.hosts);
				timespan.init(data.raw);
				
				if (data.keys && data.keys.length > 0){
					calendar.init(new Date(data.keys.reduce(function(a,b){return Math.max(a,b)}) * 1000));
				}else{
					calendar.init(null);
				}
		
				overview.init(data, cf, update);
				overlays.init(data.zones, data.apps);
				ko.applyBindings(overview, $("#overall")[0]);
		
				ajaxservice.ajaxGetJson('web/bootstrap', {family:family}, function(data){
					tags.init(cf);
					tagger.init();
					
					ko.applyBindings(calendar, $("#calendar")[0]);
					ko.applyBindings(tagger, $("#tagger")[0]);
					ko.applyBindings(tags, $("#tags")[0]);
					ko.applyBindings(overlays, $("#overlays")[0]);
					ko.applyBindings(timespan, $("#timespan")[0]);
					$('.hideonload').css('display','block');
				});
			});
    	}
    	
    return{
    	init:init,
    	update:update,
    }
   
});
