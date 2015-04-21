define(['jquery', 'knockout', 'knockoutpb'], function($,ko){
	
	var

		hosts	= ko.observableArray([]),
		
		selectedhost = ko.observable().publishOn("host"),
		
		selectnewhost = function(host){
			console.log("hosts,  selected new host");
			console.log(host);
			selectedhost(host);
		},
		
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
		
		init = function(hlist){
			console.log("IN HOSTS INIT!");
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
