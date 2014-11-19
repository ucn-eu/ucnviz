define(['jquery','ajaxservice', 'knockout',  'knockoutpb'], function($,ajaxservice,ko){
	
	var
	
		//respond to new host selected (ko.postbox)
		
		_queries 	= [],
		_locations 	= [],
		_apps		= [],
		
		showqueries   	= ko.observable(false),
		showlocations   = ko.observable(false),
		showapps   		= ko.observable(false),
		shownotes 		= ko.observable(false).publishOn("notes"),
		
		selectedquery = ko.observable(""),
		
		
		_queryListener = ko.postbox.subscribe("query", function(data){
			
			if (data){
				selectedquery(data.query);
			}else{
				selectedquery("");
			}
		}),
		
		//don't need to pull this in again and again, do array filter on original!
		_rangeListener = ko.postbox.subscribe("range", function(data) {
			if (!data)
				return;
			queries([]);
			ajaxservice.ajaxGetJson('web/queries',{host:data.host, fromts: data.fromts, tots:data.tots}, updatequeries);
			//ajaxservice.ajaxGetJson('web/apps',{host:data.host, fromts: data.fromts, tots:data.tots}, updatequeries);
		}),
		
		
		queryisselected = function(query){
			return selectedquery() == query;
		},	
		
		updatequeries = function(data){
			if (data && data.queries){
				_queries = data.queries;
				if (showqueries()){
					queries(_queries);
				}
			}
		},
		
		queries 	= ko.observableArray([]).publishOn("queries"),
		
		locations 	= ko.observableArray([]).publishOn("locations"),
		
		apps 		= ko.observableArray([]).publishOn("apps"),
		
		
		
		togglequeries = ko.computed(function(){
			if (!showqueries()){
				queries([]);
			}else{
				queries(_queries);
			}
		}),
				
				
		togglelocations = ko.computed(function(){
			if (!showlocations()){
				locations([]);
			}else{
				locations(_locations);
			}
		}),
		
		toggleapps = ko.computed(function(){
			if (!showapps()){
				apps([]);
			}else{
				apps(_apps);
			}
		}),
				
		
		init = function(locations, apps){
			_locations = locations;
			_apps	   = apps;
		}
		
	return{
		init: init,
		queries:queries,
		
		showqueries: showqueries,
		showapps: showapps,
		showlocations: showlocations,
		shownotes: shownotes,
		selectedquery:selectedquery,
		queryisselected:queryisselected,
	}
});
