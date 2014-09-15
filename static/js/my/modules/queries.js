define(['jquery','ajaxservice', 'knockout',  'knockoutpb'], function($,ajaxservice,ko){
	
	var
	
		//respond to new host selected (ko.postbox)
		
		_rangeListener = ko.postbox.subscribe("range", function(data) {
			if (!data)
				return;
			ajaxservice.ajaxGetJson('web/queries',{host:data.host, fromts: data.fromts, tots:data.tots}, updatequeries);
		}),
		
		updatequeries = function(data){
			if (data && data.queries){
				queries(data.queries);
			}
		},
		
		queries = ko.observableArray([])
	
				
	return{
		queries:queries,
	}
});
