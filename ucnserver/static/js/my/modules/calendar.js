define(['jquery','knockout','knockout-kendo','knockoutpb'], function($,ko){
	
	var 
		startDate = ko.observable(new Date()),
		
		init = function(){
			console.log("initing calendar!!");
		}
		
		
	return{
		init:init, 
		startDate: startDate,
	}
});