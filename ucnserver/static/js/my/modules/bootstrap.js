define(['module'], function (module) {
    //Will be the value 'blue'
    
    var 
    	init = function(){
    	 	var family = module.config().family;
    		console.log("yes, family is ");
    		console.log(family);
    	}
    	
    return{
    	init:init
    }
   
});
