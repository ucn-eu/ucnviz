define(['jquery','knockout','knockout-kendo','knockoutpb'], function($,ko){
	
	var 
		
		_currentdate, //init flag, to ensure rangechange is triggered only when date changes, not when first inited
		
		calendardate  = ko.observable(),//.syncWith("calendardate", false),
		
		timerange	  = ko.observable().syncWith("range"),
		
		selectedhost = ko.observable(),
		
		_hostListener = ko.postbox.subscribe("host", function(host) {
			if (host){
				selectedhost(host);
			}	
		}),
		
		
		_dateListener = calendardate.subscribe(function(date){
			
			if (date){
				var day 	=  date.getDate();
				var month 	=  date.getMonth();
				var year	=  date.getFullYear();
			 
				var fromts  = new Date(Date.UTC(year,month,day,0,0,0,0)).getTime()/1000;
				var tots	= new Date(Date.UTC(year,month,day,23,59,59,0)).getTime()/1000;
				
				if (_currentdate){
					console.log("calendar - triggering update");
					timerange({host:selectedhost(), fromts:parseInt(fromts), tots:parseInt(tots)});
				}
				_currentdate = date;
			}
		}),
		
		init = function(date){
			console.log("initing calendar date...");
			calendardate(date);
		}
		
		
		
	return{
		init:init, 
		calendardate: calendardate,
	}
});