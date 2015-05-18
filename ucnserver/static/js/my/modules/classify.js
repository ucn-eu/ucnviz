define(['ajaxservice','d3'], function(ajaxservice,d3){
	var
		init = function(host){
				ajaxservice.ajaxGetJson('classify/host', {host:host}, function(data){
					console.log("ok got data");
					console.log(data);

				});
		}

	return{
		init: init
	}

});
