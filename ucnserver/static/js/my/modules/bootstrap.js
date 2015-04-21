define(['module', 'jquery', 'moment','modules/calendar', 'modules/colours', 'modules/overlays', 'modules/overview', 'modules/tagger', 'modules/tags', 'modules/timespan', 'knockout', 'ajaxservice', 'knockoutpb'], function(module, $, moment, calendar,cf,overlays, overview, tagger, tags, timespan, ko, ajaxservice) {
   
    var 
    	family,
    	
    	_earliest = 9999999999,
			
		_latest = -1,
		
		currentrange			= {},
		//dispatch events
		
		selectedhost        = null,
		
		dispatch_tags  		= ko.observable().publishOn("tags_changed"),
    	
    	dispatch_tagger  	= ko.observable().publishOn("tagger_changed"),
    	
    	dispatch_overview	= ko.observable().publishOn("browsing_changed"),
    	
    	//when a new host is selected, we need to pull in the raw activity data,
    	//the urls for tagging and the tags that belong to this host
    	_hostListener = ko.postbox.subscribe("host", function(data){
			
			if (!data){
				selectedhost = null;
			}
			else{
				selectedhost = data;
				_updatetaggerdata();
				_updatetimespandata();
			}
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
						currentrange.fromts = newmin;
						currentrange.tots = newmax;
						data.keys.forEach(function(d){
							_earliest = Math.min(_earliest, d);
							_latest = Math.max(_latest, d);
						});
						
						//update all of the components!
						cf.init(data.hosts);
						overview.init(data);
						overlays.init(data.zones, data.apps);
						timespan.update(data.raw);
						_updatetaggerdata();
    				}
    			});	
    		}
    		else{
    			//let browsing know that the selected range has changed (no need to pull in new data)
    			currentrange.fromts = range.fromts;
    			currentrange.tots = range.tots;
    			dispatch_overview(currentrange);
    			//pull in new data for tags / taggers regardless of whether new data
    			_updatetaggerdata();
    		}		
    	}),
    	
    	_updatetimespandata = function(){
    		if (selectedhost){
    			console.log("about to query with currentrange");
    			console.log(currentrange);
    			
    			ajaxservice.ajaxGetJson('web/browsing',{host:selectedhost, fromts:currentrange.fromts, tots:currentrange.tots}, function(data){
					timespan.update(data.raw);
				});
    		}
    	},
    	
    	_updatetaggerdata = function(){
    		var fromts = currentrange.fromts;
    		var tots = currentrange.tots;
    		
    		if (selectedhost){
				ajaxservice.ajaxGetJson('tag/urlsfortagging',{host:selectedhost, fromts:fromts, tots:tots}, function(tagdata){
					tagdata.fromts=fromts;
					tagdata.tots=tots;
					tagdata.host=selectedhost;
					dispatch_tagger(tagdata);
				});
			
				var bin = _calculatebin(tots-fromts);
				//and update the tag data as appropriate
				ajaxservice.ajaxGetJson('tag/activity',{host:selectedhost, fromts:fromts, tots:tots, bin:bin}, function(tagdata){	
					tagdata.fromts=fromts;
					tagdata.tots=tots;
					tagdata.host=selectedhost;
					dispatch_tags(tagdata);
				});
			}
    	},
    	
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
				currentrange.fromts = data.raw.mints;
				currentrange.tots = data.raw.maxts;
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
