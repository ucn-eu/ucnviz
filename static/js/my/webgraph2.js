define(['jquery','ajaxservice', 'knockout','moment','flotr', 'flot', 'flottime', 'flotselection', 'flotsymbol'], function($,ajaxservice,ko,moment){
	
	var
	
		ZOOMVALUE = 50,
		
		cache  	  = [],
		
		barwidths = [60*60*24*1000,60*60*1000,60*1000],
		
		barmultiplier 	= [12*60*60*1000, 30*60*1000, 30*1000],
				
		ctype	 = ko.observable("browsing"),
			
		subtitle = ko.observable(""),
		
		tagtoview = ko.observable(),
		
		showtag   = ko.observable(false),
		
		domainsfortag = ko.observableArray([]),
		
		queries	 = ko.observableArray([]),
		
		overlay	 = ko.observable(false),
		
		zonekey  = ko.observableArray([]),
		
		hosts	= ko.observableArray([]),
		
		topsites = ko.observableArray([]),
		
		tags	 = ko.observableArray([]),
		
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
		
		chosentag = ko.observable(""),
		
		urlsfortagging = ko.observableArray([]),
		
		chosenurlstotag	= ko.observableArray([]),
		
		newtag			= ko.observable(""),
		
		depth = ko.observable(0),
		
		tagadded = function(){	
			newtag("")
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
		},
		
		addtag 	= function(){
			ajaxservice.ajaxGetJson('addtag', {tag:newtag()}, tagadded);
		},
		
		shouldshowtags = ko.computed(function(){
			return urlsfortagging().length > 0;
		});
		
		squidclass = ko.computed(function(){
			if (ctype() == "zoom"){
				return "columns small-8";
			}else{
				return "columns small-12";
			}
		});
		
		showkey = ko.computed(function(){
			return ctype() == "zoom";
		});
		
		squidgraphstyle = ko.computed(function(){
			if (ctype() == "browsing"){
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
				if (ctype() == "browsing")
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
		
		
		calculatebin = function(difference){
			if (difference < 60 * 60){ // if range < 1 hour, minute by minute bins
				b = 1;
			}
			else if(difference <= (24 * 60 * 60)){ //if range is > 1hr and less than a day, show hourly bins
				b = 60; //60 * 60;
			}else if (difference < (24*60*60*7)){ //if range is > day and <= 1 week
				b = 60 * 60; //60 * 60 * 24;
			}else{
				b = 60 * 60 * 24;//60 * 60 * 24 * 30;
			} 
			
			return b;
		},
		
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
		
		formatstr = function(bin){
			s = "";
				
			if (bin == 60 * 60 * 24){
				s =  'YYYY/MM/DD'
			}else if (bin == 60 * 60){
				s = 'YYYY/MM/DD HH:00'
			}else if (bin == 60){
				s = 'YYYY/MM/DD HH:mm'
			}else{
				s = 'YYYY/MM/DD HH:mm:ss'
			}
			console.log("FORMAT STR IS " + s);
			return s;
		},
		
		init = function(hlist,taglist){
			
			hosts(hlist);
			tags(taglist);
			
			selectedhost(hosts()[0]);
			
			parameters[0] = {host: selectedhost(), bin:60*60*24};
			ajaxservice.ajaxGetJson('summary',parameters[0], renderroot);
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
			
			/*placeholder.bind("plotselected", function(event,ranges){
				selected = true;
				fromts = parseInt((ranges.xaxis.from + barmultiplier[depth()])/1000);
				tots   = parseInt((ranges.xaxis.to + barmultiplier[depth()]) /1000);
				tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
				ajaxservice.ajaxGetJson('urlsfortagging',{host:selectedhost(),fromts:fromts, tots:tots}, updatetagdata);
				setTimeout(function(){selected=false},100);
			});*/
			
			placeholder.bind("plotselected", function(event,ranges){
				
				console.log(ranges);
				
				bin	 = parameters[depth()].bin;
				data = cache[depth()].summary;
				 
				fs = formatstr(bin);
				
				fromts 	= parseInt((ranges.xaxis.from + (bin/2)*1000)/1000);
				tots   	= parseInt((ranges.xaxis.to + (bin/2)*1000)/1000);
				console.log("from ts = " + ranges.xaxis.from + " to ts = " + ranges.xaxis.to );
				console.log("adlterated from ts = " + fromts + " to ts = " + tots);
				
				frm 	= moment.unix(fromts);
				to 		= moment.unix(tots);
				start 	= (moment(frm.format(fs), fs).valueOf()) / 1000;
				end   	= (moment(to.format(fs), fs).valueOf()) / 1000;
				total	= 0;
				
				
				console.log(data);
				
				for (i = start; i <= end; i += bin){
					m = moment.unix(i);
					console.log("chceking for " + m.format(fs));
					for (j = 0; j < data.length; j++){
						if (data[j][0] == m.format(fs)){
							total += data[j][1];
							break;
						}
					}
				}
				
				console.log("TOTAL IS " + total);
				
			
				selected = true;				
				var difference = tots - fromts;
				bin = calculatebin(difference);
				
				console.log("** FROM TS IS " + frm.format(fs) + "TO TS IS " +   to.format(fs));
				parameters[depth()+1] = {host: selectedhost(), bin:bin, fromts:fromts, tots:tots};
					
				tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
				
				ajaxservice.ajaxGetJson('urlsfortagging',{host:selectedhost(),fromts:fromts, tots:tots}, updatetagdata);
				
				
				if (total > ZOOMVALUE){
					depth(depth()+1);
					ajaxservice.ajaxGetJson('summary',parameters[depth()], renderroot);
						
				}else{
					console.log("rendering browsinG!!");
					depth(depth()+1);
					ajaxservice.ajaxGetJson('browsing' ,{host: selectedhost(), fromts: fromts, tots: tots}, curry(renderzoom,fromts));// fromts+torange[depth()-1]}, curry(renderzoom,fromts));	
				}
					
				setTimeout(function(){selected=false},100);
			});
			
			placeholder.bind("plotclick", function(event,pos,item){
				
				if (selected)
					return;
				
				if (item){
					data 	= cache[depth()].summary;
					bin 	= parameters[depth()].bin;
					fs 		= formatstr(bin);
				
					fts 	= parseInt(item.datapoint[0] + (bin/2)*1000)/1000;
					frm 	= moment.unix(fts);
				
					total = 0;
					for (i = 0; i < data.length; i++){
						if (data[i][0] == frm.format(fs)){
							total = data[i][1];
							break;
						}
					}
				
					fromts 	= (moment(frm.format(fs), fs).valueOf()) / 1000;
					tots    = fromts + bin;
					
					console.log("from is " + moment.unix(fromts).format(fs) + " to is " +  moment.unix(tots).format(fs) );
					bin = calculatebin(tots-fromts);
					
					parameters[depth()+1] = {host: selectedhost(), bin:bin, fromts:fromts, tots:tots};
			
					//parameters[depth()+1] = {host: selectedhost(), bin:Math.pow(60,2-depth()),fromts:fromts, tots:fromts + torange[depth()]};
						
					if (total > ZOOMVALUE){
						depth(depth()+1);
						ajaxservice.ajaxGetJson('summary',parameters[depth()], renderroot);
						
					}else{
						depth(depth()+1);
						ajaxservice.ajaxGetJson('browsing' ,{host: selectedhost(), fromts: fromts, tots: tots}, curry(renderzoom,fromts));// fromts+torange[depth()-1]}, curry(renderzoom,fromts));	
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
			ajaxservice.ajaxGetJson('urlsfortag',{host:selectedhost(), tag:tagtoview()}, updatedomainsfortag);
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
		
		removetag = function(tag){
			console.log("would remove tag" + tag);
			ajaxservice.ajaxGetJson('removetag',{host: selectedhost(), tag:tag}, tagremoved);
		},
		
		tagremoved = function(data){
			//reload dependent data
			ajaxservice.ajaxGetJson('activity',{host: selectedhost()}, renderactivity);
			ajaxservice.ajaxGetJson('urlsfortagging',tagparameters[0], updatetagdata);
			ajaxservice.ajaxGetJson('urlsfortag',{host:selectedhost(), tag:tagtoview()}, updatedomainsfortag);
		},
		
		zoomoutvisible = ko.computed(function(){
			return depth() > 0;
		}),
		
		zoomout = function(){
			if (depth() > 0){
				depth(depth()-1);
			}
			console.log("getting parematers for depth " + depth());
			console.log(parameters[depth()]);
			
			ajaxservice.ajaxGetJson('summary',parameters[depth()], renderroot);
		},
		
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
		
		renderroot = function(data){
			
			cache[depth()] = data;
		
			bin = parameters[depth()].bin;
			
			placeholder.height(400);
			ctype("browsing");
			
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
			
		
			//if (depth() == 0)
			//	subtitle(m1.format('MMM Do YYYY') + " to " + m2.format('MMM Do YYYY'));
			//else
				subtitle(m1.format('MMM Do YYYY h:mm:ss a') + " to " + m2.format('MMM Do YYYY h:mm:ss a'));
				
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
				bars: { show: true, barWidth:bin*1000, /*barwidths[depth()],*/ align:'center', fill: 0.4 },
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
		
		getdomainsfortag	 = function(tag){
			tagtoview(tag);
			showtag(true);
			ajaxservice.ajaxGetJson('urlsfortag',{host:selectedhost(), tag:tag}, updatedomainsfortag);
		},
		
		updatedomainsfortag = function(data){
			domainsfortag(data.urls);
		},
		
		renderdomain = function(domain,data){
			
			ctype("domain");
			
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
			
			//key = document.getElementById("activitykey");
			
			Flotr.draw(container, data, options);
			
			//$('#activitykey p').remove();
			
			//_.each(tags().reverse(),function(val,k) {
      		//	$(key).append('<p style="height:' + ((tags().length+1)*20)/tags().length + 'px;"><a href="#">'+val+'</a></p>');
    		//});
    
		},
		
		
		renderzoom = function(from,netdata){
			
			ctype("zoom");
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
				idx = labels.indexOf(traffic[i].domain);
				
				if (idx == -1){
					labels.push(traffic[i].domain);
					readings.push([]);
				}
		
				readings[labels.indexOf(traffic[i].domain)].push([traffic[i].ts*1000, labels.indexOf(traffic[i].domain)-0.5, 1000]);
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
		tagheight: tagheight,
		reversedtags:reversedtags,
		chosentag: chosentag,
		newtag: newtag,
		addtag: addtag,
		getdomainsfortag: getdomainsfortag,
		domainsfortag:domainsfortag,
		tagtoview: tagtoview,
		showtag:showtag,
		removetag: removetag,
		
		depth:depth,
		squidclass: squidclass,
		squidgraphstyle: squidgraphstyle,
		rendertagselectionitem:rendertagselectionitem,
		showkey:showkey,
	}
});
