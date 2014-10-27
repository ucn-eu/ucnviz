define(['module', 'jquery', 'modules/calendar', 'modules/colours', 'modules/overlays', 'modules/overview', 'modules/tagger', 'modules/tags', 'knockout', 'ajaxservice'], function(module, $, calendar,cf,overlays, overview, tagger, tags, ko, ajaxservice) {
   
    var 
    	init = function(){
    	 	//this is passed in through require.js (see browsing.html)
    	 	var family = module.config().family;
    		
    		ajaxservice.ajaxGetJson('overview/activity', {family:family}, function(data){
		
				cf.init(data.hosts);
				
				if (data.keys && data.keys.length > 0){
					calendar.init(new Date(data.keys.reduce(function(a,b){return Math.max(a,b)}) * 1000));
				}else{
					calendar.init(null);
				}
		
				overview.init(data, cf);
				overlays.init(data.zones, data.apps);
				ko.applyBindings(overview, $("#overall")[0]);
		
				ajaxservice.ajaxGetJson('web/bootstrap', {family:family}, function(data){
					tags.init(cf);
					tagger.init();
			
					ko.applyBindings(calendar, $("#calendar")[0]);
					ko.applyBindings(tagger, $("#tagger")[0]);
					ko.applyBindings(tags, $("#tags")[0]);
					ko.applyBindings(overlays, $("#overlays")[0]);
					$('.main').css('display','block');
				});
			});
    	}
    	
    return{
    	init:init
    }
   
});
