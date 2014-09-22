define(['jquery', 'moment', 'knockout', 'knockoutpb'], function($,moment,ko){
	
	var
	
		
	
		_rangeListener = ko.postbox.subscribe("fromto", function(data) {
			if (data.length > 0){
				m1 = moment.unix((data[0].getTime())/1000);
				m2 = moment.unix((data[1].getTime())/1000);
				timetext(m1.utc.format('MMM Do YYYY h:mm:ss a') + " to " + m2.utc.format('MMM Do YYYY h:mm:ss a'));	
			}
		}),
		
		timetext = ko.observable("")
				
	return{
		timetext:timetext,
	}
});