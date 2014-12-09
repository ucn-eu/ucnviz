define(['jquery','ajaxservice', 'knockout','moment', 'knockoutpb', 'flotr', 'knockout-bootstrap'], function($,ajaxservice,ko,moment){
	
	"use strict";
	
	var
		colourfactory,
		
		fromts,tots,bin,
		
		mints = Number.MAX_VALUE, //used to record the fromts for fully zoomed out
		
		maxts = -1, //used to record the tots for fully zoomed out
		
		timerange	  	= ko.observable().syncWith("range", false),
		
		newtag 		  	= ko.observable("").syncWith("newtag", true),
		
		domainsfortag 	= ko.observableArray([]), //.publishOn("association"),
		
		tagevent		= ko.observable("").publishOn("association"),
		
		tags			= ko.observableArray([]).publishOn("tags"),
		
		showtagdetails = ko.observable(false),
		
		selectedtag 	= ko.observable(),
		selecteddomain = ko.observable(),
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
			mints = Math.min(mints, fromts);
			maxts = Math.max(maxts, tots);
			bin = calculatebin(tots-fromts);	
			tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
			
			// update activity too!
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);	
			
		}),
		
		
		calculatebin = function(difference){
		
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
		
		
		hosts	= ko.observableArray([]),
		
	
		subtitle = ko.observable(""),
	
		
		reversedtags = ko.computed(function(){
			var reversed = [];
			for (var i = tags().length-1; i >= 0; i--){
				reversed.push(tags()[i]);
			}
			return reversed;
		}),
		
		toggletagdetails = function(){
			showtagdetails(true);
			showtagdetails.notifySubscribers();
		},
		
		tagheight = ko.computed(function(){
			return ((tags().length+1)*20)/tags().length + "px"
		}),
				
		tagadded = function(){	
			newtag("");
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);
		},
		
		addtag = function(){
			if (newtag() != ""){
				ajaxservice.ajaxGetJson('tag/add', {tag:newtag(), host:selectedhost()}, tagadded);
			}
		},
		
		selectedhost = ko.observable(),
		
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
				
		tagparameters = [],	
	
		init = function(cf){
			colourfactory = cf;			
		},
		
		updatedomainsfortag = function(data){
			domainsfortag(data.urls);
		},
		
		updateandnotify = function(data){
			domainsfortag(data.urls);
			tagevent(data.urls);
		},
		
		getdomainsfortag	 = function(tag){
			ajaxservice.ajaxGetJson('tag/urlsfortag',{host:selectedhost(), tag:tag}, updatedomainsfortag);
		},
		
		removeassociation = function(tag, domain){	
			ajaxservice.ajaxGetJson('tag/removeassociation',{host: selectedhost(), tag:tag, domain:domain}, curry(tagupdated, tag));
		},
		
		removetag = function(tag){
			ajaxservice.ajaxGetJson('tag/removetag',{tag:tag, host: selectedhost()}, curry(tagupdated, tag));
		},
	
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
		
		
		tagupdated = function(tag, data){
			
			//reload dependent data
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(),fromts:fromts, tots:tots, bin:bin}, renderactivity);
			//ajaxservice.ajaxGetJson('tag/urlsfortagging',tagparameters[0], updatetagdata);
			
			//need to pass in tag, NOT data, which is the domain that was deleted!
			
			ajaxservice.ajaxGetJson('tag/urlsfortag',{host:selectedhost(), tag:tag}, updateandnotify);
		},
		
	
		intimerange = function(ts, trange){
			
			var ranges = trange.filter(function(item){
				if ((ts >=  item[0])  && (ts <= item[0] + item[2]))
					return item;
			});
			
			if (ranges.length > 0){
				selecteddomain(ranges[0][3]);
			}
			return ranges.length > 0;
		
		},
		
		renderactivity = function(data){
			var m1,m2;
			var container = document.getElementById("activitygraph");
			var timeline  = {show:true, barWidth: .8 };
			 
			var activity = data.activity;	
			tags(data.tags);		
			
				
    		var start 	= Number.MAX_VALUE;
			var end 	= 0;
    		var data 	= [];
    		var readings = [];
    
    		
    		for (var i = 0; i < tags().length; i++){
    			readings[i] = [];
    		}
    		
			for(var i = 0; i < activity.length; i++){
				
				start = Math.min(start, activity[i].fromts);
				end = Math.max(end, activity[i].tots);
				var timespan = Math.max(1000, (activity[i].tots - activity[i].fromts) * 1000);
				readings[tags().indexOf(activity[i].tag)].push([activity[i].fromts*1000, tags().indexOf(activity[i].tag)-0.5, timespan, activity[i].domain ]);
			}
				
			var tickFormatter = function(x){
				m1 = moment.unix(x/1000);
				
				if ((tots-fromts) > 24*60*60){
					return m1.format('DD/MM hh:mm');
				}
				return m1.format('hh:mm:ss a');
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
			
		
			var options = {
				  xaxis : {
					mode : 'time',
					labelsAngle : 90,
					min: start * 1000,
					max: end * 1000,
					noTicks:48,
					timeMode: 'UTC',
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
				  mouse: {
				  			track: true, 
							trackall: true,
							trackY: true,
							relative: true,
							fillOpacity: 1,
							position: 'cw',
				   		    trackFormatter: function (val) { 
                              var y = parseInt(Math.ceil(val.y));
                              var ts = Math.floor(val.x);
                              
                              var idx = val.series.data.map(function(item){
                              	return item[0]
                              }).indexOf(ts);
                              
                              return val.series.data[idx][3];
                              
                        
                              //var rowno = row - Math.floor(val.y) - 2;
                              //return Object.keys(data[label[rowno]][ts]['hst']).toString();
                        }},
				  HtmlText : false,
			};
			
			
			$(container).height( ((tags().length+1) * 20) + 70 );
			
		
			
			//lhs info
			$(".tagchartbar").height(((tags().length+1) * 20) + 150 );
			
			Flotr.draw(container, data, options);
			
			
			Flotr.EventAdapter.observe(container, 'flotr:click', function(position){
				//do we need to pass specific url into activity data?
				
				var y = parseInt(Math.ceil(position.y));
				
				var index = tags().indexOf(tags()[y]);
				selectedtag(tags()[y]);
				if (intimerange(Math.floor(position.x), readings[index])){
					toggletagdetails(true);
				}
				else{
					timerange({host:selectedhost(), fromts:mints, tots:maxts});
				}
			});
		
			Flotr.EventAdapter.observe(container, 'flotr:select', function(area){
				timerange({host:selectedhost(), fromts:parseInt(area.x1/1000), tots:parseInt(area.x2/1000)});
			});
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
		removeassociation: removeassociation,
		removetag: removetag,
		toggletagdetails: toggletagdetails,
		showtagdetails:showtagdetails,
		selectedtag:selectedtag,
		selecteddomain:selecteddomain
	}
});
