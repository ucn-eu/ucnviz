define(['d3'], function(d3){
	var 
		
		colours = {},
		
		colorfactory = d3.scale.category10(),
	 	
	 	colourfor = function(host){
	 	
			if (!colours[host]){
				colours[host] = colorfactory(host);
			}	
			
			return colours[host];	
	 	},

		init = function(hosts){
			//colorfactory.domain(hosts);
		
			for (i = 0; i < hosts.length; i++){
				colours[hosts[i]] = colorfactory(hosts[i]);
			}		
		}
		
	return{
		init: init,
		colourfor: colourfor
	}
	
});