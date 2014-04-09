define(['jquery'], function($){
    var
    
        ajaxPostJson = function(url, jsonIn, success_callback, error_callback){
            $.ajax({
                    url: url,
                    //contentType: 'application/x-www-form-urlencoded',
                    type: "POST",
                    data: jsonIn,
                    dataType: 'json',
                    success: function(result){
                        success_callback(result)    
                    },
                    error: function(XMLHttpRequest, textStatus, errorThrown){
                        if (error_callback){
                            error_callback(XMLHttpRequest, textStatus, errorThrown);
                        }       
                    }
            });
        }
    
        ajaxGetJson = function(url, jsonIn, success_callback, error_callback){
         
            $.ajax({
                    url: url,
                    //contentType: 'application/x-www-form-urlencoded',
                    type: "GET",
                    data: jsonIn,
                    timeout: 4000,
                    dataType: 'json',
                    
                    success: function(result){
                        success_callback(result)    
                    },
                    error: function(XMLHttpRequest, textStatus, errorThrown){
                        if (error_callback){
                            error_callback(XMLHttpRequest, textStatus, errorThrown);
                        }       
                    }
            });
        }
        
        return{
            ajaxPostJson: ajaxPostJson,
            ajaxGetJson: ajaxGetJson
        }
});

