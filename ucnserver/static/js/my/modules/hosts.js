define(['jquery', 'knockout', 'knockoutpb'], function($,ko){
	
	var

		hosts	= ko.observableArray([]),
		
		selectedhost = ko.observable().publishOn("host"),
		
		selectnewhost = function(host){
			selectedhost(host);
		},
		
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
		
		init = function(hlist){
			//hosts(hlist);
			//selectedhost(hosts()[0]);
		}
	
	return{
		init: init,
		hosts:hosts,
		amselectedhost: amselectedhost,
		selectnewhost: selectnewhost,
	}
});
