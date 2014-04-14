define(['jquery','ajaxservice', 'knockout','moment','flotr', 'flot', 'flottime', 'flotselection', 'flotsymbol'], function($,ajaxservice,ko,moment){
	
	var
	
		barwidths = [60*60*24*1000,60*60*1000,60*1000],
		
		barmultiplier 	= [12*60*60*1000, 30*60*1000, 30*1000],
				
		ctype	 = "browsing",
			
		subtitle = ko.observable(""),
		
		queries	 = ko.observableArray([]),
		
		overlay	 = ko.observable(false),
		
		zonekey  = ko.observableArray([]),
		
		hosts	= ko.observableArray([]),
		
		topsites = ko.observableArray([]),
		
		tags	 = ko.observableArray([]),
		
		chosentag = ko.observable(""),
		
		urlsfortagging = ko.observableArray([]),
		
		chosenurlstotag	= ko.observableArray([]),
		
		newtag			= ko.observable(""),
		
		depth = ko.observable(0),
		
		tagadded = function(){	
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
		},
		
		addtag 	= function(){
			ajaxservice.ajaxGetJson('addtag', {tag:newtag()}, tagadded);
		},
		
		shouldshowtags = ko.computed(function(){
			return urlsfortagging().length > 0;
		});
		
		squidclass = ko.computed(function(){
			if (depth() == 3){
				return "columns small-8";
			}else{
				return "columns small-12";
			}
		});
		
		squidgraphstyle = ko.computed(function(){
			if (depth() == 3){
				return "width: 630px;";
			}else{
				return "width: 530px;";
			}
		});
		
		selectedhost = ko.observable(),
		
		selected = false;
		
		selectnewhost = function(host){
			depth(0);
			selectedhost(host);
			parameters[0] = {host: selectedhost(), bin:60*60*24};
			urlsfortagging([]);
			ajaxservice.ajaxGetJson('summary',parameters[0], renderroot);
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
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
		
		tagparameters = [],
		
		placeholder = $("#squidgraph"),
		
		
		colorchart	= ["#FFE3E3", "#F2F5A9", "#f5ffea", "#ddffff", "#A9BCF5"],
		
		colorlookup = {},
		
		 
		colorindex = 0,
		
		
		
		clickcallback = function(){
			depth(depth() - 1);
			ajaxservice.ajaxGetJson('summary', parameters[depth()], renderroot);
		},
		
		selectcallback = function(range,item){
			fromts = parseInt(range.x1/1000);
			tots   = parseInt(range.x2/1000);
			tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
			ajaxservice.ajaxGetJson('urlsfortagging',{host:selectedhost(),fromts:fromts, tots:tots}, updatetagdata);
		},
		
		init = function(hlist,taglist){
			
			hosts(hlist);
			tags(taglist);
			
			selectedhost(hosts()[0]);
		
			parameters[0] = {host: selectedhost(), bin:60*60*24};
	
			ajaxservice.ajaxGetJson('summary',parameters[0], renderroot);
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
			
			placeholder.bind("plotselected", function(event,ranges){
				selected = true;
				fromts = parseInt(ranges.xaxis.from/1000);
				tots   = parseInt(ranges.xaxis.to/1000);
				tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
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
			
			ajaxservice.ajaxGetJson('tagurls', {host:selectedhost(), domains:domains, tag:chosentag()}, urlstagged);
		},
		
		urlstagged = function(data){
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
			ajaxservice.ajaxGetJson('urlsfortagging',tagparameters[0], updatetagdata);
		},
		
		updatetagdata = function(data){
			urlsfortagging(data.urls);
		},
		
		rendertagselectionitem = function(item){
			tag = "";
			if (item.tag)
				tag = "| " + item.tag;
				 
			return item.domain + ' | ' + item.requests + tag;
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
			placeholder.height(400);
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
				{data:pdata, points:{symbol:"cross"}}
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
						radius: 3
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
				readings[tags().indexOf(activity[i].tag)].push([activity[i].ts*1000, tags().indexOf(activity[i].tag)-0.5, 1000]);
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
					noTicks: 48,
					showLabels : false
				  },
				  yaxis : {
					min: -1,
					max:tags().length-1,
					showLabels : false,
					noTicks:tags().length-1,
				  },
				  selection : {
					mode : 'x'
				  }
			};
			
			$(container).height((tags().length+1) * 20);
			
			key = document.getElementById("activitykey");
			
			Flotr.draw(container, data, options);
			
			$('#activitykey p').remove();
			
			_.each(tags().reverse(),function(val,k) {
      			$(key).append('<p style="height:' + ((tags().length+1)*20)/tags().length + 'px;">'+val+'</p>');
    		});
    
		},
		
		
		renderzoom = function(from,netdata){
			
			ctype	 = "zoom";
			container = document.getElementById("squidgraph");
			traffic = netdata.traffic;			
			labels = [];
			timeline = {
            	show: true,
            	barWidth: 0.5,
        	};
			
			start 	= Number.MAX_VALUE;
			end 	= 0;
    		data 	= [];
    		readings = [];
    		
			for(i = 0; i < traffic.length; i++){
				start = Math.min(start, traffic[i].ts);
				end = Math.max(end, traffic[i].ts);
				idx = labels.indexOf(traffic[i].url);
				
				if (idx == -1){
					labels.push(traffic[i].url);
					readings.push([]);
				}
		
				readings[labels.indexOf(traffic[i].url)].push([traffic[i].ts*1000, labels.indexOf(traffic[i].url)-0.5, 1000]);
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
					noTicks: 48,
					showLabels : false
				  },
				  yaxis : {
					min: -1,
					max:readings.length-1,
					showLabels : false,
					noTicks:readings.length-1,
				  },
				  selection : {
					mode : 'x'
				  }
			};
			
			$(container).height((readings.length+1) * 20);
			
			key = document.getElementById("zoomkey");
			
			Flotr.draw(container, data, options);
			
			$('#zoomkey p').remove();
			
			_.each(labels.reverse(),function(val,k) {
      			$(key).append('<p style="height:' + ((labels.length+1)*20)/labels.length + 'px;">'+val+'</p>');
    		});
    
			//incase already attached..
			Flotr.EventAdapter.stopObserving(container, 'flotr:click', clickcallback);
			Flotr.EventAdapter.stopObserving(container, 'flotr:select', selectcallback);
			//and add
			Flotr.EventAdapter.observe(container, 'flotr:click', clickcallback); 
			Flotr.EventAdapter.observe(container, 'flotr:select', selectcallback);  
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
		tagurls:tagurls,
		tags: tags,
		chosentag: chosentag,
		newtag: newtag,
		addtag: addtag,
		depth:depth,
		squidclass: squidclass,
		squidgraphstyle: squidgraphstyle,
		rendertagselectionitem:rendertagselectionitem
	}
});
