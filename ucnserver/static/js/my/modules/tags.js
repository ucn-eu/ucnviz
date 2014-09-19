define(['jquery','ajaxservice', 'knockout','moment', 'knockoutpb', 'flotr', 'knockout-bootstrap'], function($,ajaxservice,ko,moment){
	
	var
		colourfactory,
		
		fromts,tots,bin,
		
		timerange	  = ko.observable().syncWith("range"),
		newtag 		  = ko.observable("").syncWith("newtag", true),
		
		
		/* set up the listeners -- listen to other modules on events of interest */
			
		/*  listen to a tag being added to a new domain */
		_domainstagged = ko.postbox.subscribe("domainstagged", function(data) {
			if (!data)
				return;
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts: fromts, tots:tots}, renderactivity);
			ajaxservice.ajaxGetJson('tag/urlsfortag',{host:selectedhost(), tag:data.tag}, updatedomainsfortag);	
		}),
		
		/* listen to a new tag being created */
		_tagListener = ko.postbox.subscribe("tagcreated", function(data) {
			tagadded();
		}),
		
		/* listen to a change in the overview chart */
		_rangeListener = ko.postbox.subscribe("range", function(data) {
			if (!data)
				return;
			selectedhost(data.host);
			fromts = data.fromts;
			tots = data.tots;
			
			bin = calculatebin(tots-fromts);	
			tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
			
			// update activity too!
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);	
			
		}),
		
		
		calculatebin = function(difference){
		
			
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
		
		domainsfortag = ko.observableArray([]),
		
		hosts	= ko.observableArray([]),
		
		tags	= ko.observableArray([]),
		
		subtitle = ko.observable(""),
	
		
		reversedtags = ko.computed(function(){
			reversed = [];
			for (i = tags().length-1; i >=0; i--){ 
				reversed.push(tags()[i]);
			}
			return reversed;
		}),
		
		tagheight = ko.computed(function(){
			return ((tags().length+1)*19)/tags().length + "px"
		}),
				
		tagadded = function(){	
			newtag("");
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);
		},
		
		addtag = function(){
			ajaxservice.ajaxGetJson('tag/add', {tag:newtag()}, tagadded);
		},
		
		selectedhost = ko.observable(),
		
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
				
		tagparameters = [],	
	
		init = function(taglist, cf){
			tags(taglist);
			colourfactory = cf;			
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
				start = Math.min(start, activity[i].fromts);
				end = Math.max(end, activity[i].tots);
				timespan = Math.max(1000, (activity[i].tots - activity[i].fromts) * 1000);
				readings[tags().indexOf(activity[i].tag)].push([activity[i].fromts*1000, tags().indexOf(activity[i].tag)-0.5, timespan ]);
			}
				
			var tickFormatter = function(x){
				m1 = moment.unix(x/1000);
				
				if ((tots-fromts) > 24*60*60){
					return m1.format('MMM Do h:mm');
				}
				return m1.format('h:mm:ss a');
			},
			
			m1 = moment.unix(fromts);
			m2 = moment.unix(tots);
			subtitle(m1.format('MMM Do YYYY h:mm:ss a') + " to " + m2.format('MMM Do YYYY h:mm:ss a'));
		
			
			
			Flotr._.each(readings, function(d){
				
				data.push({
					data:d,
					timeline:Flotr._.clone(timeline)
				});
			});
			
			options = {
				  xaxis : {
					mode : 'time',
					labelsAngle : 90,
					min: start * 1000,
					max: end * 1000,
					noTicks:48,
					showLabels : true,
				 	tickFormatter: tickFormatter,
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
				  },
				  HtmlText : false,
			};
			
			$(container).height( ((tags().length+1) * 20) + 70 );
			$(".tagchartbar").height(((tags().length+1) * 20) + 150 );
			Flotr.draw(container, data, options);
		
		}	
	
	return{
		init:init,
		subtitle:subtitle,
		tagheight: tagheight,
		reversedtags:reversedtags,
		getdomainsfortag: getdomainsfortag,
		domainsfortag:domainsfortag,
		newtag:newtag,
		addtag:addtag,
		removetag: removetag,
	}
});
