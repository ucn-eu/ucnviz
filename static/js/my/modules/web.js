define(['jquery','ajaxservice', 'knockout','moment','flotr', 'flot', 'flottime', 'flotselection', 'flotsymbol', 'knockoutpb'], function($,ajaxservice,ko,moment){
	
	var
	
		timerange	  = ko.observable().syncWith("range"),
		
		
		/* set up listeners-- listen on host / range change from overview */
		_rangeWatcher = ko.postbox.subscribe("range", function(data) {
			selectedhost(data.host);
			fromts = data.fromts;
			tots = data.tots;
			parameters[depth()] = {host: selectedhost(), bin:calculatebin(tots-fromts), fromts:fromts, tots:tots};
			ajaxservice.ajaxGetJson('web/summary',parameters[depth()], renderroot);
		}),
		
		
		ZOOMVALUE = 50,
		
		cache  	  = [],
		
		barwidths = [60*60*24*1000,60*60*1000,60*1000],
		
		barmultiplier 	= [12*60*60*1000, 30*60*1000, 30*1000],
				
		ctype	 = ko.observable("browsing"),
			
		subtitle = ko.observable(""),
		
		overlay	 = ko.observable(false),
		
		zonekey  = ko.observableArray([]),
		
		tags	 = ko.observableArray([]),
		
		depth = ko.observable(0),
		
		squidclass = ko.computed(function(){
			if (ctype() == "zoom"){
				return "columns small-8";
			}else{
				return "columns small-12";
			}
		}),
		
		showkey = ko.computed(function(){
			return ctype() == "zoom";
		});
		
		squidgraphstyle = ko.computed(function(){
			if (ctype() == "browsing"){
				return "width: 650px;";
			}else{
				return "width: 550px;";
			}
		}),
		
		selected = false,
		
		selectedhost = ko.observable(),
	
		
		
		toggleoverlay = function(){
			overlay(!overlay());
			renderroot(cache[depth()]);
			/*if (depth() <= 2){
				ajaxservice.ajaxGetJson('web/summary',parameters[depth()], renderroot);
			}*/
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
			depth(depth() - 1);
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
		
		init = function(){
			
			placeholder.bind("plotselected", function(event,ranges){
				
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
				
				selected = true;
				var difference = tots - fromts;				
				bin = calculatebin(difference);
				parameters[depth()+1] = {host: selectedhost(), bin:bin, fromts:fromts, tots:tots};
			
				
				if (total > ZOOMVALUE){
					depth(depth()+1);
					timerange({fromts:fromts, tots:tots, host:selectedhost()});
				}else{
					depth(depth()+1);
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
					
					
					if (total > ZOOMVALUE){
						depth(depth()+1);
						timerange({fromts:fromts, tots:tots, host:selectedhost()});	
					}else{
						depth(depth()+1);
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
			cache[depth()] = data;
		
			bin = parameters[depth()].bin;
			
			placeholder.height(200);
			ctype("browsing");
			
			var 
    			d1 = [],
    			i, x, o;
				
			summary = data.summary;
			zones = data.zones;
		
						
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
					markings.push({color: zcolor, xaxis:{from: (zones[i].enter*1000)-((bin/2)*1000), to: (zones[i].exit*1000)-((bin/2)*1000)}});
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
				start = Math.min(start, traffic[i].ts);
				end = Math.max(end, traffic[i].ts);
				idx = labels.indexOf(traffic[i].domain);
				
				if (idx == -1){
					labels.push(traffic[i].domain);
					readings.push([]);
				}
		
				readings[labels.indexOf(traffic[i].domain)].push([traffic[i].ts*1000, labels.indexOf(traffic[i].domain)-0.5, 1000]);
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
			Flotr.EventAdapter.observe(container, 'flotr:select',  selectcallback);  
		}
	
	return{
		
		init:init,
		subtitle:subtitle,
		overlay:overlay,
		toggleoverlay:toggleoverlay,
		zonekey:zonekey,
		
		
		amselectedhost: amselectedhost,
		
		zoomout:zoomout,
		zoomoutvisible:zoomoutvisible,	
		depth:depth,
		squidclass: squidclass,
		squidgraphstyle: squidgraphstyle,
		showkey:showkey,
	}
});
