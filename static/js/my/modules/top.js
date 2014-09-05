define(['jquery','ajaxservice', 'knockout'], function($,ajaxservice,ko){
	
	var
	
		//respond to new host selected (ko.postbox)
		
		topsites = ko.observableArray([]),
		
		siteselected = function(site){
		
		},
		
		init = function(hlist,taglist){
			//retrieve top sites for selected host and update topsites array!
		}
				
	return{
		init:init,
		topsites:topsites,
		siteselected:siteselected
	}
});
