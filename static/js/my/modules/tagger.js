define(['jquery','ajaxservice', 'knockout', 'knockoutpb', 'bootstrap', 'custom_bindings'], function($,ajaxservice,ko){
	
	var
		
		tagtoview = ko.observable(),
		
		domainsfortag = ko.observableArray([]),
		
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
		
		chosenurlstotag = ko.observableArray([]),
		
		newtag			= ko.observable(""),
			
		showtagger 		= ko.observable(false),
		
		tagadded = function(){	
			newtag("");
			//ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost(), fromts:fromts, tots:tots, bin:bin}, renderactivity);
		},
		
		addtag 	= function(){
			ajaxservice.ajaxGetJson('tag/add', {tag:newtag()}, tagadded);
		},
		
		shouldshowtags = ko.computed(function(){
			return urlsfortagging().length > 0;
		}),
		
		toggletagger = function(){
			showtagger(true);
			showtagger.notifySubscribers();
		},
	
		selectedhost = ko.observable(),
		
		_shs = ko.observable().subscribeTo("host").subscribe(function(ahost) {
    		selectedhost(ahost);
    		urlsfortagging([]);
			//ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost()}, renderactivity);
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
			ajaxservice.ajaxGetJson('tag/urlsfortagging',{host:selectedhost(),fromts:fromts, tots:tots}, updatetagdata);
		}),

		init = function(taglist){
			tags(taglist);			
		},
		
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
			//ajaxservice.ajaxGetJson('tag/activity',{host: selectedhost()}, renderactivity);
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
		
		domainsfortag:domainsfortag,
		tagtoview: tagtoview,
		toggletagger:toggletagger,
		showtagger: showtagger,
		
		
		rendertagselectionitem:rendertagselectionitem,
		
	}
});
