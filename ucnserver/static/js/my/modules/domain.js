define(['jquery','ajaxservice', 'knockout','moment','flotr', 'flot', 'flottime', 'flotselection', 'flotsymbol'], function($,ajaxservice,ko,moment){
	
	var
	
		depth = ko.observable(0), //knockout pb this!
		
		parameters = [],
			
		init = function(){
			
		},
		
		overlay	 = ko.observable(false),
		
		zonekey  = ko.observableArray([]),
		
		//for overlaying the zones!
		
		colorchart	= ["#FFE3E3", "#F2F5A9", "#f5ffea", "#ddffff", "#A9BCF5"],
		
		colorlookup = {},
		
		colorindex = 0,
		
		toggleoverlay = function(){
			overlay(!overlay());
			if (depth() <= 2){
				ajaxservice.ajaxGetJson('web/domainsummary',parameters[depth()], curry(renderdomain,parameters[depth()]['domain']));
			}
		},
		
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
		
		requestsfordomain = function(adomain){
			parameters[depth()]['domain'] = adomain;
			ajaxservice.ajaxGetJson('web/domainsummary',parameters[depth()], curry(renderdomain,adomain));
		},
		
		renderdomain = function(domain,data){
			
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
					markings.push({color: zcolor, xaxis:{from: (zones[i].enter*1000)-((bin/2)*1000), to: (zones[i].exit*1000)-((bin/2)*1000)}});
			
					//markings.push({color: zcolor, xaxis:{from: (zones[i].enter*1000)-barmultiplier[depth()], to: (zones[i].exit*1000)-barmultiplier[depth()]}});
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
		}
		
	return{
		init:init,
		requestsfordomain:requestsfordomain,
		depth:depth,
		toggleoverlay:toggleoverlay
	}
});
