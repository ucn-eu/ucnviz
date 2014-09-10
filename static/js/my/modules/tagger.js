define(['jquery','ajaxservice', 'knockout', 'knockoutpb', 'bootstrap', 'custom_bindings'], function($,ajaxservice,ko){
	
	var
		
		tagtoview = ko.observable(),
		
		domainstagged = ko.observable().publishOn("domainstagged"),
		
		tagcreated	  = ko.observable().publishOn("tagcreated"),
		
		domainsfortag = ko.observableArray([]),
		
		tags	 = ko.observableArray([]),
		
		fromts,
		tots,
		bin,
		
		chosentag = ko.observable(""),
		
		urlsfortagging = ko.observableArray([]),
		
		chosenurlstotag = ko.observableArray([]),
		
		newtag			= ko.observable(""),
			
		showtagger 		= ko.observable(false),
		
		tagadded = function(data){
			console.log(data);	
			if (data.success){
				//let the activity chart know..
				tags.push(newtag());
				tagcreated({"tag":newtag(), ts:(new Date()).getTime()});
				//update our list of tags!
				newtag("");
			}
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
			
			fromts = data.fromts;// parseInt(data.fromts/1000);
			tots = data.tots;//parseInt(data.tots/1000);
			
			console.log(fromts);
			console.log(tots);
			
			bin = data.bin;
			tagparameters[0] = {host:selectedhost(), fromts:fromts, tots:tots};
			ajaxservice.ajaxGetJson('tag/urlsfortagging',{host:selectedhost(),fromts:fromts, tots:tots}, updatetagdata);
		}),

		init = function(taglist){
			console.log("taglist is " + taglist);
			tags(taglist);			
		},
		
		/*
		 * send the tagged data to server
		 */
		tagurls = function(){
			domains = [];
			
			for (i = 0; i < chosenurlstotag().length; i++)
				domains.push(chosenurlstotag()[i].domain);
			
			ajaxservice.ajaxGetJson('tag/tagurls', {host:selectedhost(), domains:domains, tag:chosentag()}, curry(urlstagged,chosentag()));
		},
		
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
		
		//fire off an event to the tags module, which will refresh the activity chart.
		urlstagged = function(tag, data){
			domainstagged({tag:tag, ts:new Date().getTime()});
			ajaxservice.ajaxGetJson('tag/urlsfortagging',{host:selectedhost()}, updatetagdata);
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
