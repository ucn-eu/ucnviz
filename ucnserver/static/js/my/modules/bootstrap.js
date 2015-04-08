define(['module', 'jquery', 'modules/calendar', 'modules/colours', 'modules/overlays', 'modules/overview', 'modules/tagger', 'modules/tags', 'modules/timespan', 'knockout', 'ajaxservice', 'knockoutpb'], function(module, $, calendar,cf,overlays, overview, tagger, tags, timespan, ko, ajaxservice) {
   
    var 
    	family,
    	
    	_earliest = 9999999999,
			
		_latest = -1,
		
		//dispatch events
		
		selectedhost        = null,
		
		dispatch_tags  		= ko.observable().publishOn("tags_changed"),
    	
    	dispatch_tagger  	= ko.observable().publishOn("tagger_changed"),
    	
    	dispatch_overview	= ko.observable().publishOn("browsing_changed"),
    	
    	_hostListener = ko.postbox.subscribe("host", function(data){
			console.log(data);
			if (!data){
				selectedhost = null;
			}
			selectedhost = data;
		}),
		
    	dispatcher = ko.postbox.subscribe("range", function(range) {
    			
    		var newmin, newmax;
    			
    		if (range.fromts < _earliest){
    			newmin	   = range.fromts;
    			newmax	   = newmin + 60*60*24*7;
    		}else{
    			newmax 	   = range.tots;
    			newmin     = newmax - 60*60*24*7;
    		}
    			
    		//find out if need to pull new data from server for browsing
    		
    		if (range.fromts < _earliest || range.tots > _latest){
    			ajaxservice.ajaxGetJson('overview/activity', {family:family, fromts:newmin, tots:newmax}, function(data){
    				if (data && data.keys){
						//set the new earliest and latest
						data.keys.forEach(function(d){
							_earliest = Math.min(_earliest, d);
							_latest = Math.max(_latest, d);
						});
					
						//update all of the components!
						cf.init(data.hosts);
						overview.init(data);
						overlays.init(data.zones, data.apps);
						timespan.update(data.raw);
    				}
    			});
    			
    		}else{
    			//let browsing know that the selected range has changed (no need to pull in new data)
    			dispatch_overview(range);
    		}	
    		
    		//pull in new data for tags / taggers regardless of whether new data
    		if (selectedhost){
				ajaxservice.ajaxGetJson('tag/urlsfortagging',{host:selectedhost, fromts:newmin, tots:newmax}, function(tagdata){
					dispatch_tagger(tagdata);
				});
			
				var bin = _calculatebin(newmax-newmin);
				//and update the tag data as appropriate
				ajaxservice.ajaxGetJson('tag/activity',{host:selectedhost, fromts:newmin, tots:newmax, bin:bin}, function(tagdata){	
					dispatch_tags(tagdata);
				});
			}
    	}),
    	
    	_calculatebin = function(difference){
		
			var b;
			
			if (difference < 60 * 60){ // if range < 1 hour, minute by minute bins
				b = 1;
			}
			else if(difference <= (2 * 24 * 60 * 60)){ //if range is > 1hr and less than 2 days, show hourly bins
				b = 60; //60 * 60;
			}else if (difference < (24*60*60*7)){ //if range is > 2 days and <= 1 week
				b = 60 * 60; //60 * 60 * 24;
			}else{
				b = 60 * 60 * 24;//60 * 60 * 24 * 30;
			} 
			
			return b;
		},
    	/*update = function(current, selected){
    		
    	
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
    	},*/
    	
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
		
				overview.init(data, cf);
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
    	//update:update,
    }
   
});
