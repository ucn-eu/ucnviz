define(['jquery','ajaxservice', 'knockout','moment','flotr', 'flot', 'flottime', 'flotselection'], function($,ajaxservice,ko,moment){
	
	var
	
		barwidths = [60*60*24*1000,60*60*1000,60*1000],
		
		barmultiplier 	= [12*60*60*1000, 30*60*1000, 30*1000],
		
		defaulttags		= ["research", "work", "gaming", "finance", "family", "video streaming", "shopping", "health", "social", "hobby", "news", "entertainment"];
				
		ctype	 = "browsing",
			
		subtitle = ko.observable(""),
		
		queries	 = ko.observableArray([]),
		
		overlay	 = ko.observable(false),
		
		zonekey  = ko.observableArray([]),
		
		hosts	= ko.observableArray([]),
		
		topsites = ko.observableArray([]),
		
		tags	 = ko.observableArray(defaulttags),
		
		chosentag = ko.observable(""),
		
		
		
		urlsfortagging = ko.observableArray([]),
		
		chosenurlstotag	= ko.observableArray([]),
		
		shouldshowtags = ko.computed(function(){
			return urlsfortagging().length > 0;
		});
		
		selectedhost = ko.observable(),
		
		selected = false;
		
		selectnewhost = function(host){
			depth(0);
			selectedhost(host);
			parameters[0] = {host: selectedhost(), bin:60*60*24};
			ajaxservice.ajaxGetJson('summary',parameters[0], renderroot);
		},
		
		toggleoverlay = function(){
			overlay(!overlay());
			if (depth() <= 2){
				if (ctype == "browsing")
					ajaxservice.ajaxGetJson('summary',parameters[depth()], renderroot);
				else
					ajaxservice.ajaxGetJson('domainsummary',parameters[depth()], curry(renderdomain,parameters[depth()]['domain']));
			}
		},
		
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
		
		parameters = [],
		
		placeholder = $("#squidgraph"),
		
		
		colorchart	= ["#FFE3E3", "#F2F5A9", "#f5ffea", "#ddffff", "#A9BCF5"],
		
		colorlookup = {},
		
		 
		colorindex = 0,
		
		depth = ko.observable(0),
		
		clickcallback = function(){
			depth(depth() - 1);
			ajaxservice.ajaxGetJson('summary', parameters[depth()], renderroot);
		},
		
		init = function(hlist){
			
			hosts(hlist);
			selectedhost(hosts()[0]);
		
			parameters[0] = {host: selectedhost(), bin:60*60*24};
	
			ajaxservice.ajaxGetJson('summary',parameters[0], renderroot);
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
			
			placeholder.bind("plotselected", function(event,ranges){
				selected = true;
				console.log(ranges);
				console.log(event);
				fromts = parseInt(ranges.xaxis.from/1000);
				tots   = parseInt(ranges.xaxis.to/1000);
				ajaxservice.ajaxGetJson('urlsfortagging',{host:selectedhost(),fromts:fromts, tots:tots}, updatetagdata);
				setTimeout(function(){selected=false},100);
			});
			
			placeholder.bind("plotclick", function(event,pos,item){
				
				if (selected)
					return;
				urlsfortagging([]);
			
				
				torange 		= [60*60*24,60*60,60];
		
				if (item){

					fromts = item.datapoint[0]/1000;
					parameters[depth()+1] = {host: selectedhost(), bin:Math.pow(60,2-depth()),fromts:fromts, tots:fromts + torange[depth()]};
							
					if (depth() < 2){
						depth(depth()+1);
						ajaxservice.ajaxGetJson('summary',parameters[depth()], renderroot);
						
					}else{
						depth(depth()+1);
						ajaxservice.ajaxGetJson('browsing' ,{host: selectedhost(), fromts: fromts, tots: fromts+torange[depth()-1]}, curry(renderzoom,fromts));	
					}
					
				}else{
					zoomout();
				}
			});
		},
		
		/*
		 * send the tagged data to server
		 */
		tagurls = function(){
			domains = [];
			
			for (i = 0; i < chosenurlstotag().length; i++)
				domains.push(chosenurlstotag()[i].domain);
			
			console.log(domains);
			
			ajaxservice.ajaxGetJson('tagurls', {host:selectedhost(), domains:domains, tag:chosentag()}, urlstagged);	
		},
		
		urlstagged = function(data){
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
		},
		
		updatetagdata = function(data){
			console.log(data.urls);
			
			urlsfortagging(data.urls);
			/*for (i =0; i< data.urls.length; i++){
				urlsfortagging.push(data.urls[i].domain);
			}*/
		},
		
		zoomoutvisible = ko.computed(function(){
			return depth() > 0;
		}),
		
		zoomout = function(){
			if (depth() > 0){
				depth(depth()-1);
			}
			ajaxservice.ajaxGetJson('summary',parameters[depth()], renderroot);
		},
		
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
		
		renderroot = function(data){
			
			ctype	 = "browsing";
			
			var 
    			d1 = [],
    			i, x, o;
				
			summary = data.summary;
			zones = data.zones;
			topsites(data.top);
			queries(data.queries);
						
			mints = Number.MAX_VALUE;
			maxts = 0;
			
			for (i = 0; i < summary.length; i++){
				ts = new Date(summary[i][0]).getTime();
				mints = Math.min(mints, ts);
				maxts = Math.max(maxts, ts);
				d1.push([ts, summary[i][1]]);
			}
		
			m1 = moment.unix(mints/1000);
			m2 = moment.unix(maxts/1000);
			
		
			if (depth() == 0)
				subtitle(m1.format('MMM Do YYYY') + " to " + m2.format('MMM Do YYYY'));
			else
				subtitle(m1.format('h:mm:ss a') + " to " + m2.format('h:mm:ss a'));
				
			var data = [{ data: d1, label: "site requests", color: "#2CA089" }];
			
			var markings = [];
			
			if (overlay()){
				for (i=0; i < zones.length; i++){
					
					zcolor = colorlookup[zones[i]['name']];
					
					if (zcolor == undefined){
						zcolor = colorchart[colorindex++ % colorchart.length];
						colorlookup[zones[i]['name']] = zcolor
						zonekey.push({"name":zones[i]['name'], "color":zcolor});
					}
					markings.push({color: zcolor, xaxis:{from: (zones[i].enter*1000)-barmultiplier[depth()], to: (zones[i].exit*1000)-barmultiplier[depth()]}});
				}
			}

			var plot = $.plot(placeholder, data, {
				bars: { show: true, barWidth:barwidths[depth()], align:'center', fill: 0.4 },
				xaxis: { mode:"time"},
				yaxis: {},
				grid: { markings: markings, clickable:true },
				selection: { mode: "x" }
			});			
		},
		
		requestsfordomain = function(adomain){
			parameters[depth()]['domain'] = adomain;
			ajaxservice.ajaxGetJson('domainsummary',parameters[depth()], curry(renderdomain,adomain));
		},
		
		renderdomain = function(domain,data){
			
			ctype	 = "domain";
			
			rdata = data.requests;
			zones = data.zones;
			pdata = [];
			 
			mints = Number.MAX_VALUE;
			maxts = 0;
		
		
			
			for (i = 0; i < rdata.length; i++){
				mints = Math.min(mints, rdata[i]);
				maxts = Math.max(maxts, rdata[i]);
				pdata.push([rdata[i]*1000, 1]);			
			}
			
			m1 = moment.unix(mints);
			m2 = moment.unix(maxts); 
			
			timerange = ""
			;
			if ((m2 - m1) <= 1.1*24*60*60){
				timerange =  m1.format('MMM Do h:mm:ss a') + " to " + m2.format('h:mm:ss a');
			}else{
				timerange =  m1.format('MMM Do YYYY') + " to " + m2.format('MMM Do YYYY');
			}
				
			subtitle(domain + " " + timerange);
			
			toplot = [
				{data:pdata, points:{symbol:"circle"}}
			]
			
			var markings = [];
			
			if (overlay()){
				for (i=0; i < zones.length; i++){
					
					zcolor = colorlookup[zones[i]['name']];
					
					if (zcolor == undefined){
						zcolor = colorchart[colorindex++ % colorchart.length];
						colorlookup[zones[i]['name']] = zcolor
						zonekey.push({"name":zones[i]['name'], "color":zcolor});
					}
					markings.push({color: zcolor, xaxis:{from: (zones[i].enter*1000)-barmultiplier[depth()], to: (zones[i].exit*1000)-barmultiplier[depth()]}});
				}
			}

			
			var plot = $.plot(placeholder, toplot, {
				series:{
					points:{
						show:true,
						radius: 2
					}
				},
				xaxis: { mode:"time"},
				yaxis: {show:false},
				grid: {markings:markings, clickable:true }
			});	
		},
		
		
		renderactivity = function(data){
			container = document.getElementById("activitygraph");
			timeline  = { show : true, barWidth : .8 };
			 
			activity = data.activity;			
			readings = [];
				
			
    
    		start 	= Number.MAX_VALUE;
			end 	= 0;
    		data 	= [];
    		readings = [];
    		
    		for (i = 0; i < defaulttags.length; i++){
    			readings[i] = [];
    		}
    		
			for(i = 0; i < activity.length; i++){
				start = Math.min(start, activity[i].ts);
				end = Math.max(end, activity[i].ts);
				readings[defaulttags.indexOf(activity[i].tag)].push([activity[i].ts*1000, defaulttags.indexOf(activity[i].tag), 1000]);
			}
			
			Flotr._.each(readings, function(d){
				data.push({
					data:d,
					timeline:Flotr._.clone(timeline)
				});
			});
			
			yticks = [];
			
			for (i = 0; i < defaulttags.length; i++){
				yticks[i] = [i,defaulttags[i]];
			}
			options = {
				  xaxis : {
					mode : 'time',
					min: start * 1000,
					max: end * 1000,
					noTicks: 48,
					showLabels : false
				  },
				  yaxis : {
				  	ticks: yticks,
					showLabels: activity.length > 1,
					/*min : 0,
					/*max : row,
					showLabels : false,
					/*noTicks: row,*/
				  },
				  selection : {
					mode : 'x'
				  }
			};
			
			Flotr.draw(container, data, options);
		},
		
		/* 
		 * use different charting lib here (flotr) as renders gantt style charts better than flot
		 */
		renderzoom = function(from,netdata){
			
			ctype	 = "zoom";
				
			container = document.getElementById("squidgraph");
			traffic = netdata.traffic;			
			unitwidth = 5;
			readings = [];
			labels = [];
			data = [];
			id = 0;
			markers = [];
			yticks = [];
			max = 30;
			timeline = {
            	show: true,
            	barWidth: 0.5,
        	};
			/* start point, id, len */
			/* calculates the horizontal widths based on the difference between the ma and min start points
			   means need at least one different start point, with big difference*/
			
			
			for (i = 0; i < traffic.length; i++){
				start = parseInt(traffic[i].ts) - from; 
				idx = labels.indexOf(traffic[i].url);
				if (idx == -1){
					readings.push([[start*unitwidth,id++,unitwidth]]);
					labels.push(traffic[i].url);
				}else{
					readings[idx].push([start*unitwidth,idx,unitwidth]);
				} 
			}
				
			// Timeline
			Flotr._.each(readings.slice(0,max), function(d) {
				data.push({
					data: d,
					timeline: Flotr._.clone(timeline)
				});
			});

			// Markers
			Flotr._.each(readings.slice(0,max), function(d) {
				
				point = d[0];
				if (point)
				markers.push([point[0], point[1]]);
			});
	
			
			for (i = 0; i < labels.length; i++){
				yticks[i] = [i,labels[i]];
			}
		
			graph = Flotr.draw(container, data, {
				xaxis: {
					noTicks: 10,
					tickFormatter: function(x) {
						return parseInt(x) / unitwidth;
					}
				},
				yaxis: {
            		ticks: yticks,
					showLabels: true,
				},
				grid: {
					horizontalLines: false,
					minorVerticalLines: true
				},
				selection: {
					mode: 'y'
				},
			});
			
			//incase already attached..
			Flotr.EventAdapter.stopObserving(container, 'flotr:click', clickcallback);
			
			//and add
			Flotr.EventAdapter.observe(container, 'flotr:click', clickcallback);  
		}
		
		
	
	return{
		init:init,
		subtitle:subtitle,
		overlay:overlay,
		toggleoverlay:toggleoverlay,
		zonekey:zonekey,
		hosts:hosts,
		amselectedhost: amselectedhost,
		selectnewhost: selectnewhost,
		topsites:topsites,
		requestsfordomain:requestsfordomain,
		queries:queries,
		zoomout:zoomout,
		zoomoutvisible:zoomoutvisible,
		
		urlsfortagging:urlsfortagging,
		chosenurlstotag:chosenurlstotag,
		shouldshowtags:shouldshowtags,
		tagurls:tagurls
	}
});
