define(['jquery','ajaxservice', 'knockout','moment','flotr', 'flot', 'flottime', 'flotselection', 'flotsymbol'], function($,ajaxservice,ko,moment){
	
	var
		
		tagtoview = ko.observable(),
		
		showtag   = ko.observable(false),
		
		domainsfortag = ko.observableArray([]),
		
		hosts	= ko.observableArray([]),
		
		tags	 = ko.observableArray([]),
		
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
		
		chosentag = ko.observable(""),
		
		urlsfortagging = ko.observableArray([]),
		
		chosenurlstotag	= ko.observableArray([]),
		
		newtag			= ko.observable(""),
			
		tagadded = function(){	
			newtag("")
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);
		},
		
		addtag 	= function(){
			ajaxservice.ajaxGetJson('tag/add', {tag:newtag()}, tagadded);
		},
		
		shouldshowtags = ko.computed(function(){
			return false;//urlsfortagging().length > 0;
		}),
	
		selectedhost = ko.observable(),
		
		
		selectedhost = ko.observable(),
		
		_shs = ko.observable().subscribeTo("host").subscribe(function(ahost) {
    		selectedhost(ahost);
    		urlsfortagging([]);
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost()}, renderactivity);
		}),
			
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
				
		tagparameters = [],
		
		placeholder = $("#squidgraph"),
		
		
		colorchart	= ["#FFE3E3", "#F2F5A9", "#f5ffea", "#ddffff", "#A9BCF5"],
		
		colorlookup = {},
		
		 
		colorindex = 0,
		
		
		_shs = ko.observable().subscribeTo("webselect").subscribe(function(data) {
			fromts = data.fromts/1000;
			tots = data.tots/1000;
			bin = data.bin;
			
			tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
			ajaxservice.ajaxGetJson('tag/urlsfortagging',{host:selectedhost(),fromts:fromts, tots:tots}, updatetagdata);
			
			//and update activity too!
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);
		
		}),

		init = function(taglist){
			tags(taglist);			
		}
		
		/*
		 * send the tagged data to server
		 */
		tagurls = function(){
			domains = [];
			
			for (i = 0; i < chosenurlstotag().length; i++)
				domains.push(chosenurlstotag()[i].domain);
			
			ajaxservice.ajaxGetJson('tag/tagurls', {host:selectedhost(), domains:domains, tag:chosentag()}, urlstagged);
		},
		
		urlstagged = function(data){
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost()}, renderactivity);
			ajaxservice.ajaxGetJson('tag/urlsfortagging',tagparameters[0], updatetagdata);
			ajaxservice.ajaxGetJson('tag/urlsfortag',{host:selectedhost(), tag:tagtoview()}, updatedomainsfortag);
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
			
			ajaxservice.ajaxGetJson('tag/remove',{host: selectedhost(), tag:tag}, tagremoved);
		},
		
		tagremoved = function(data){
			//reload dependent data
			ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost()}, renderactivity);
			ajaxservice.ajaxGetJson('tag/urlsfortagging',tagparameters[0], updatetagdata);
			ajaxservice.ajaxGetJson('tag/urlsfortag',{host:selectedhost(), tag:tagtoview()}, updatedomainsfortag);
		},
		
		getdomainsfortag	 = function(tag){
			tagtoview(tag);
			showtag(true);
			ajaxservice.ajaxGetJson('tag/urlsfortag',{host:selectedhost(), tag:tag}, updatedomainsfortag);
		},
		
		updatedomainsfortag = function(data){
			domainsfortag(data.urls);
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
		
		rendertagselectionitem:rendertagselectionitem,
		
	}
});
