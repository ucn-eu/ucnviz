define(['jquery','ajaxservice', 'knockout'], function($,ajaxservice,ko){
	
	var
	
		//respond to new host selected (ko.postbox)
		
		queries = ko.observableArray([]),
		
		queryselected = function(query){
		
		},
		
		init = function(){
			//retrieve queries for selected host and update queries array!
		}
				
	return{
		init:init,
		queries:queries,
		queryselected:queryselected
	}
});
