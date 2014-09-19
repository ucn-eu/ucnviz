define(['jquery','ajaxservice', 'knockout',  'knockoutpb'], function($,ajaxservice,ko){
	
	var
	
		//respond to new host selected (ko.postbox)
		
		_queries = [],
		
		showqueries   = ko.observable(false),
		
		//don't need to pull this in again and again, do array filter on original!
		_rangeListener = ko.postbox.subscribe("range", function(data) {
			if (!data)
				return;
			queries([]);
			ajaxservice.ajaxGetJson('web/queries',{host:data.host, fromts: data.fromts, tots:data.tots}, updatequeries);
		}),
		
		updatequeries = function(data){
			if (data && data.queries){
				_queries = data.queries;
				if (showqueries()){
					queries(_queries);
				}
			}
		},
		
		queries = ko.observableArray([]).publishOn("queries"),
	
		
		togglequeries = function(){
			showqueries(!showqueries());
			if (!showqueries()){
				queries([]);
			}else{
				queries(_queries);
			}
		}
				
	return{
		queries:queries,
		togglequeries: togglequeries,
		showqueries: showqueries,
	}
});
