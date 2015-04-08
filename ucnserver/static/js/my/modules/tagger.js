define(['jquery','ajaxservice', 'knockout', 'moment', 'knockoutpb', 'bootstrap', 'custom_bindings'], function($,ajaxservice,ko,moment){
	
	var
		
		tagtoview = ko.observable(),
		
		domainstagged = ko.observable().publishOn("domainstagged"),
		
		tagcreated	  = ko.observable().publishOn("tagcreated"),
		
		timetext = ko.observable(""),
		
		taggerlabel = ko.computed(function(){
			return "tag activity <small>" + timetext() + "<small>";
		}),
		
		_hostListener = ko.postbox.subscribe("host", function(data){
			
			if (!data){
				urlsfortagging([]);
				selectedhost(null);
			}else{
				selectedhost(data);	
			}
		}),
		
		_tagListener = ko.postbox.subscribe("tags", function(data) {
			
			if (data){
				tags(data);
			}		
		}),
		
		_timeListener = ko.postbox.subscribe("fromto", function(data) {
			if (data.length > 0){
				m1 = moment.unix((data[0].getTime())/1000);
				m2 = moment.unix((data[1].getTime())/1000);
				timetext(m1.format('MMM Do YYYY h:mm:ss a') + " to " + m2.format('MMM Do YYYY h:mm:ss a'));	
			}
		}),
		
		_dispatchListener = ko.postbox.subscribe("tagger_changed", function(data) {
			
			if (!data){
				return;
			}
			fromts = data.fromts;
    		tots = data.tots;
			selectedhost(data.host);
		    urlsfortagging(data.urls);			
		}),
		
		
		/*
		 * Listen on updates on associations between tags and domains.  If an association is changes (from tags module), reload the urls for tagging
		 */
		_domainListener = ko.postbox.subscribe("association", function(data){
			
			ajaxservice.ajaxGetJson('tag/urlsfortagging',{host:selectedhost(), fromts:fromts, tots:tots}, updatetagdata);
		}),
		
		domainsfortag = ko.observableArray([]),
		
		tags	 = ko.observableArray([]),
		
		fromts,
		tots,
		
		chosentag = ko.observable(""),
		
		urlsfortagging = ko.observableArray([]),
		
		chosenurlstotag = ko.observableArray([]),
		
		newtag			= ko.observable(""),
			
		showtagger 		= ko.observable(false),
		
		tagadded = function(withincurrentrange, data){
		
			if (data.success){
				//let the activity chart know..
				tags.push(newtag());
				tagcreated({"tag":newtag(), ts:(new Date()).getTime()});
				//update our list of tags!
				chosentag(newtag());
				newtag("");
				tagurls(withincurrentrange);
			}
		},
		
		addtag 	= function(withincurrentrange){
			if (newtag() && newtag() != ""){
				ajaxservice.ajaxGetJson('tag/add', {tag:newtag(), host:selectedhost()}, curry(tagadded,withincurrentrange));
			}
		},
		
		shouldshowtags = ko.computed(function(){
			return urlsfortagging().length > 0;
		}),
		
		toggletagger = function(){
			showtagger(true);
			showtagger.notifySubscribers();
		},
		
		selectedhost = ko.observable(null),
		
		tagdisabled = ko.computed(function(){
			return selectedhost() == null;
		}),
		
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
			
		init = function(){
					
		},
		
		/*
		 * send the tagged data to server
		 */
		tagurls = function(withincurrentrange){
		
			if (newtag() && newtag()!=""){
				addtag(withincurrentrange);
			}else{
			
				domains = [];
			
				for (i = 0; i < chosenurlstotag().length; i++)
					domains.push(chosenurlstotag()[i].domain);
			
				var params = {host:selectedhost(), domains:domains, tag:chosentag()};
				
				
				if (withincurrentrange){
					params['fromts'] = fromts;
					params['tots'] = tots;
				}
				ajaxservice.ajaxGetJson('tag/tagurls', params , curry(urlstagged,chosentag()));
			}
		},
		
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
		
		
		urlstagged = function(tag, data){
			
			//fire off an event to the tags module, which will refresh the activity chart.
			domainstagged({tag:tag, ts:new Date().getTime()});
			//update the current tag data!
		
			ajaxservice.ajaxGetJson('tag/urlsfortagging',{host:selectedhost(), fromts:fromts, tots:tots}, updatetagdata);
		},
		
		selectall = function(){
			chosenurlstotag(urlsfortagging());
		},
		
		updatetagdata = function(data){
			urlsfortagging(data.urls);
		},
		
		rendertagselectionitem = function(item){
			tag = "";
			if (item.tag)
				tag = " | " + item.tag;
			
			//' | ' + item.requests	 
			return item.domain + tag;
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
		tagdisabled:tagdisabled,
		
		timetext:timetext,
		
		rendertagselectionitem:rendertagselectionitem,
		taggerlabel: taggerlabel,
		selectall:selectall,
	}
});
