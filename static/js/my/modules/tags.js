define(['jquery','ajaxservice', 'knockout','moment', 'knockoutpb', 'flotr', 'knockout-bootstrap'], function($,ajaxservice,ko,moment){
	
	var
		
		domainsfortag = ko.observableArray([]),
		
		hosts	= ko.observableArray([]),
		
		tags	= ko.observableArray([]),
		
		newtag  = ko.observable("").syncWith("newtag", true),
		
		fromts,
		
		tots,
		
		bin,
		
		reversedtags = ko.computed(function(){
			reversed = [];
			for (i = tags().length-1; i >=0; i--){ 
				reversed.push(tags()[i]);
			}
			return reversed;
		}),
		
		tagheight = ko.computed(function(){
			return ((tags().length+1)*20)/tags().length + "px"
		}),
				
		tagadded = function(){	
			newtag("");
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);
		},
		
		addtag = function(){
			ajaxservice.ajaxGetJson('tag/add', {tag:newtag()}, tagadded);
		},
		
		selectedhost = ko.observable(),
		
		_shs = ko.observable().subscribeTo("host").subscribe(function(ahost) {
    		selectedhost(ahost);
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost()}, renderactivity);
		}),
			
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
				
		tagparameters = [],	
		
		_shs = ko.observable().subscribeTo("webselect").subscribe(function(data) {
			fromts = data.fromts/1000;
			tots = data.tots/1000;
			bin = data.bin;
			
			tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
			
			// update activity too!
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);
		
		}),

		init = function(taglist){
			tags(taglist);			
		},
		
		updatedomainsfortag = function(data){
			domainsfortag(data.urls);
		},
		
		getdomainsfortag	 = function(tag){
			ajaxservice.ajaxGetJson('tag/urlsfortag',{host:selectedhost(), tag:tag}, updatedomainsfortag);
		},
		
		
		removetag = function(tag, domain){	
			ajaxservice.ajaxGetJson('tag/remove',{host: selectedhost(), tag:domain}, curry(tagremoved, tag));
		},
		
		
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
		
		
		tagremoved = function(tag, data){
			
			//reload dependent data
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost()}, renderactivity);
			//ajaxservice.ajaxGetJson('tag/urlsfortagging',tagparameters[0], updatetagdata);
			
			//need to pass in tag, NOT data, which is the domain that was deleted!
			ajaxservice.ajaxGetJson('tag/urlsfortag',{host:selectedhost(), tag:tag}, updatedomainsfortag);
		},
		
		renderactivity = function(data){
		
			container = document.getElementById("activitygraph");
			timeline  = { show : true, barWidth : .8 };
			 
			activity = data.activity;	
			tags(data.tags);		
				
    		start 	= Number.MAX_VALUE;
			end 	= 0;
    		data 	= [];
    		readings = [];
    
    		
    		for (i = 0; i < tags().length; i++){
    			readings[i] = [];
    		}
    		
    	
			for(i = 0; i < activity.length; i++){
				start = Math.min(start, activity[i].ts);
				end = Math.max(end, activity[i].ts);
				readings[tags().indexOf(activity[i].tag)].push([activity[i].ts*1000, tags().indexOf(activity[i].tag)-0.5, 100000]);
			}
			
			Flotr._.each(readings, function(d){
				
				data.push({
					data:d,
					timeline:Flotr._.clone(timeline)
				});
			});
			
			options = {
				  xaxis : {
					mode : 'time',
					min: start * 1000,
					max: end * 1000,
					noTicks:48,
					showLabels : false,
					margin: true
				  },
				  yaxis : {
					min: -1,
					max:tags().length-1,
					showLabels : false,
					
					noTicks:tags().length-1,
					margin: true
				  },
				  selection : {
					mode : 'x'
				  }
			};
			
			$(container).height((tags().length+1) * 20);
			Flotr.draw(container, data, options);
		
		}	
	
	return{
		init:init,
		tagheight: tagheight,
		reversedtags:reversedtags,
		getdomainsfortag: getdomainsfortag,
		domainsfortag:domainsfortag,
		newtag:newtag,
		addtag:addtag,
		removetag: removetag,
	}
});
