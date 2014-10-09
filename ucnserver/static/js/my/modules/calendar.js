define(['jquery','knockout','knockout-kendo','knockoutpb'], function($,ko){
	
	var 
		
		calendardate  = ko.observable().syncWith("calendardate"),
		
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
			
				timerange({host:selectedhost(), fromts:parseInt(fromts), tots:parseInt(tots)});
			}
		}),
		
		init = function(date){
			calendardate(date);
		}
		
		
		
	return{
		init:init, 
		calendardate: calendardate,
	}
});