define(['jquery','ajaxservice', 'knockout','moment','flotr', 'flot', 'flottime', 'flotselection', 'flotsymbol', 'knockoutpb'], function($,ajaxservice,ko,moment){
	
	var
	
		colourfactory,
		
		timerange	  = ko.observable().syncWith("range"),
		
		zoomedin  	  = false, //nasty hack for now..
		
		/* set up listeners-- listen on host / range change from overview */
		_rangeListener = ko.postbox.subscribe("range", function(data) {
			if (!data)
				return;
			
			selectedhost(data.host);
			fromts = data.fromts;
			tots = data.tots;
			parameters[depth()] = {host: selectedhost(), bin:calculatebin(tots-fromts), fromts:fromts, tots:tots};
			console.log("zoomed in is " + zoomedin);
			if (!zoomedin){
				ajaxservice.ajaxGetJson('web/summary',parameters[depth()], renderroot);
			}
		}),
		
		
		ZOOMVALUE = 50,
		
		
		
		cache  	  = [],
		
		barwidths = [60*60*24*1000,60*60*1000,60*1000],
		
		barmultiplier 	= [12*60*60*1000, 30*60*1000, 30*1000],
				
		ctype	 = ko.observable("browsing"),
			
		subtitle = ko.observable(""),
		
		overlaylocation	= ko.observable(false),
		overlayapps	 	= ko.observable(false),
		
		zonekey  = ko.observableArray([]),
		appkey	 = ko.observableArray([]),
		
		zonekeynames = ko.computed(function(){
			return zonekey().map(function(value){
				return value.name;
			});
		}),
		
		appkeynames = ko.computed(function(){
			return appkey().map(function(value){
				return value.name;
			});
		}),
		
		tags	 = ko.observableArray([]),
		
		depth = ko.observable(0),
		
		squidclass = ko.computed(function(){
			if (ctype() == "zoom"){
				return "col-md-10";
			}else{
				return "col-md-12";
			}
		}),
		
		showkey = ko.computed(function(){
			return ctype() == "zoom";
		});
		
		selected = false,
		
		selectedhost = ko.observable(),
	
		
		togglelocationoverlay = function(){
			overlayapps(false);
			overlaylocation(!overlaylocation());
			renderroot(cache[depth()]);
		},
		
		toggleappoverlay = function(){
			overlaylocation(false);
			overlayapps(!overlayapps());
			renderroot(cache[depth()]);
		},
		
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
		
		parameters = [],
		
		placeholder = $("#squidgraph"),
		
		//following for the zone overlay!
					
		colorchart	= ["#FFE3E3", "#F2F5A9", "#f5ffea", "#ddffff", "#A9BCF5"],
		
		colorlookup = {},
		
		colorindex = 0,
		
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
		
		clickcallback = function(){
			zoomedin = false;
			depth(depth() - 1);
			timerange(parameters[depth()]);
			//timerange({fromts:fromts, tots:tots, host:selectedhost()});
			//ajaxservice.ajaxGetJson('web/summary', parameters[depth()], renderroot);
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

			return s;
		},
		
		init = function(cf){
			
			colourfactory = cf;
			
			placeholder.bind("plotselected", function(event,ranges){
				selected = true;
				
				/* need to punt this logic into the rangeselected function */
				
				bin	 = calculatebin(parameters[depth()].tots - parameters[depth()].fromts);
				
				data = cache[depth()].summary;
					
				fromts 	= parseInt((ranges.xaxis.from + (bin/2)*1000)/1000);
				tots   	= parseInt((ranges.xaxis.to + (bin/2)*1000)/1000);
				start = parseInt(Math.floor(fromts/bin)*bin);
				end	  = parseInt(Math.floor(tots/bin)*bin);
				total	= 0;
				
				for (i = start; i <= end; i += bin){
					for (j = 0; j < data.length; j++){
						if (data[j][0] == i){
							total += data[j][1];
							break;
						}
					}
				}
				
				
				var difference = tots - fromts;				
				bin = calculatebin(difference);
				parameters[depth()+1] = {host: selectedhost(), bin:bin, fromts:fromts, tots:tots};
				depth(depth()+1);
				
				zoomedin = total <= ZOOMVALUE;
					
				timerange({fromts:fromts, tots:tots, host:selectedhost()});	
					
				if (zoomedin){
					ajaxservice.ajaxGetJson('web/browsing' ,{host: selectedhost(), fromts: fromts, tots: tots}, curry(renderzoom,fromts));// fromts+torange[depth()-1]}, curry(renderzoom,fromts));	
				}
					
				setTimeout(function(){selected=false},100);
			});
			
			placeholder.bind("plotclick", function(event,pos,item){
				
				if (selected)
					return;
				
				if (item){
					data 	= cache[depth()].summary;
					
					bin 	= parameters[depth()].bin;
				
					fromts 	= parseInt(item.datapoint[0] + (bin/2)*1000)/1000;
					tots	= fromts + bin;
					
					ts = parseInt(Math.floor(fromts/bin)*bin);
					
					total = 0;
					
					for (i = 0; i < data.length; i++){
						if (data[i][0] == ts){ 
							total = data[i][1];
							break;
						}
					}
					
					bin = calculatebin(tots-fromts);
					
					parameters[depth()+1] = {host: selectedhost(), fromts:fromts, tots:tots};
					
					depth(depth()+1);
					
					zoomedin = total <= ZOOMVALUE;
					
					timerange({fromts:fromts, tots:tots, host:selectedhost()});	
					
					if (zoomedin){
						ajaxservice.ajaxGetJson('web/browsing' ,{host: selectedhost(), fromts: fromts, tots: tots}, curry(renderzoom,fromts));// fromts+torange[depth()-1]}, curry(renderzoom,fromts));	
					}
				}else{
					zoomout();
				}
			});
		},
		
		zoomoutvisible = ko.computed(function(){
			return depth() > 0;
		}),
		
		zoomout = function(){
			
			if (depth() > 0){
				depth(depth()-1);
			}
			timerange(parameters[depth()]);
			
		},
		
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
		
		renderroot = function(data){
			ctype("browsing");
			cache[depth()] = data;
		
			bin = parameters[depth()].bin;
			
			placeholder.height(200);
			
			
			var 
    			d1 = [],
    			i, x, o;
				
			summary = data.summary;
			zones = data.zones;
			apps  = data.apps;
					
			mints = Number.MAX_VALUE;
			maxts = 0;
			
			for (i = 0; i < summary.length; i++){
				ts = summary[i][0]*1000;
				mints = Math.min(mints, ts);
				maxts = Math.max(maxts, ts);
				d1.push([ts, summary[i][1]]);
			}
		
			
			m1 = moment.unix(parameters[depth()].fromts? parameters[depth()].fromts : mints/1000);
			m2 = moment.unix(parameters[depth()].tots? parameters[depth()].tots: maxts/1000);
			subtitle(m1.format('MMM Do YYYY h:mm:ss a') + " to " + m2.format('MMM Do YYYY h:mm:ss a'));
				
			
			var data = [{ data: d1, label: "site requests", color: colourfactory.colourfor(selectedhost())}];
			
			var markings = [];
			
			if (overlaylocation()){
				for (i=0; i < zones.length; i++){
					zcolor = colourfactory.colourfor(zones[i]['name'])
					if (zonekeynames().indexOf(zones[i]['name']) == -1){
						zonekey.push({"name":zones[i]['name'], "color":zcolor});
					}
					markings.push({color: zcolor, xaxis:{from: (zones[i].enter*1000)-((bin/2)*1000), to: (zones[i].exit*1000)-((bin/2)*1000)}});
				}
			}
			else if (overlayapps()){
				for (i=0; i < apps.length; i++){
					zcolor = colourfactory.colourfor(apps[i]['name'])
					if (appkeynames().indexOf(apps[i]['name']) == -1){
						appkey.push({"name":apps[i]['name'], "color":zcolor});
					}
					markings.push({color: zcolor, xaxis:{from: (apps[i].start*1000)-((bin/2)*1000), to: (apps[i].end*1000)-((bin/2)*1000)}});
				}
			}
			
			var plot = $.plot(placeholder, data, {
				
				bars: { show: true, barWidth:bin*1000, align:'center', fill: 0.4 },
				xaxis: { mode:"time"},
				yaxis: { },
				
				grid: { markings: markings, clickable:true },
				selection: { mode: "x" }
			});			
		},
			
		selectcallback = function(range,item){
			bin    = parameters[depth()].bin;
			fromts = parseInt(range.x1/1000);
			tots   = parseInt(range.x2/1000);
			timerange({fromts:fromts, tots:tots, host:selectedhost()});
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
				start = Math.min(start, traffic[i].fromts);
				end = Math.max(end, traffic[i].tots);
				idx = labels.indexOf(traffic[i].domain);
				
				if (idx == -1){
					labels.push(traffic[i].domain);
					readings.push([]);
				}
				var timespan = Math.max(1000, (traffic[i].tots - traffic[i].fromts) * 1000);
				readings[labels.indexOf(traffic[i].domain)].push([traffic[i].fromts*1000, labels.indexOf(traffic[i].domain)-0.5, timespan]);
			}
			
		
			m1 = moment.unix(start);
			m2 = moment.unix(end); 
			t_timerange =  m1.format('MMM Do h:mm:ss a') + " to " + m2.format('h:mm:ss a');	
			subtitle(t_timerange);
			
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
					max: (end * 1000) + 1000,
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
				val = val.substring(0, Math.min(val.length, 20));
      			$(key).append('<p class="keyline" style="height:' + ((labels.length+1)*20)/labels.length + 'px;">'+val+'</p>');
    		});
    		
			//incase already attached..
			Flotr.EventAdapter.stopObserving(container, 'flotr:click', clickcallback);
			Flotr.EventAdapter.stopObserving(container, 'flotr:select', selectcallback);
			//and add
			Flotr.EventAdapter.observe(container, 'flotr:click', clickcallback); 
			Flotr.EventAdapter.observe(container, 'flotr:select',  selectcallback);  
		}
	
	return{
		
		init:init,
		subtitle:subtitle,
		
		overlaylocation:overlaylocation,
		overlayapps:overlayapps,
		
		togglelocationoverlay:togglelocationoverlay,
		toggleappoverlay:toggleappoverlay,
		
		zonekey:zonekey,
		appkey:appkey,
		
		amselectedhost: amselectedhost,
		
		zoomout:zoomout,
		zoomoutvisible:zoomoutvisible,	
		depth:depth,
		squidclass: squidclass,
		showkey:showkey,
	}
});
