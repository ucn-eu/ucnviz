define(['knockout'], function(ko){
    
    ko.bindingHandlers.allowBindings = {
     	init: function (element, valueAccessor){
     		var shouldAllowBindings = ko.unwrap(valueAccessor());
     		return {controlsDescendantBindings: !shouldAllowBindings};
     	}
    };
    
    ko.bindingHandlers.bootstrapModal = {
    	 init: function (element, valueAccessor, allBindingsAccessor){
    	 	var allBindings = allBindingsAccessor();
    	 	var $element = $(element);
    	 	$element.addClass("modal");
    	 	
    	 	if (allBindings.modalOptions){
    	 		if (allBindings.modalOptions.beforeClose){
    	 			$element.on('hide', function(){
    	 				console.log("in before close!!");
    	 				return allBindings.modalOptions.beforeClose();
    	 			});
    	 		}
    	 	}
    	 },
    	 
    	 update: function(element, valueAccessor){
    	 
    	 	var value = valueAccessor();
    	 	
    	 	if (value()){
    	 		$(element).modal('show');
    	 		
    	 	}else{
    	 		$(element).modal('hide');	
    	 		
    	 	}
    	 }
    };
    
    ko.bindingHandlers.bootstrapPopover = { 
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) { 
             var options = valueAccessor();
             var defaultOptions={};
             options = $.extend(true, {}, defaultOptions, options);
             $(element).popover(options);
             
             options.content.subscribe(function(newValue){
                if ($(element).data && $(element).data('popover')){
                    if ($(element).data('popover').tip().hasClass("in"))
                        $(element).popover('show');
                }
             });
         }
    };
    
    
    ko.bindingHandlers.executeOnEnter = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var allBindings = allBindingsAccessor();
            $(element).keypress(function (event) {
                var keyCode = (event.which ? event.which : event.keyCode);
                if (keyCode === 13) {
                    allBindings.executeOnEnter.call(viewModel);
                    return false;
                }
                return true;
            });
        }
    };
    
    ko.bindingHandlers.viewMoreBinding = {
        init: function(element, valueAccessor){
            var shouldDisplay = valueAccessor();
            $(element).toggle(shouldDisplay());
        },
        
        update: function(element, valueAccessor){
            var shouldDisplay = valueAccessor();
            if (shouldDisplay()){ 
                $(element).fadeIn();
            }
            else{
                $(element).hide();
            }
        }
    };
    
    
    ko.bindingHandlers.showpressed = {
        init: function(element, valueAccessor){
           var changecolour = valueAccessor();
        },
        
        update: function(element, valueAccessor){
        	var changecolour = valueAccessor();
        	
        	if (changecolour()){
        	 	$(element).addClass("pushed");
        	}else{
        		$(element).removeClass("pushed");
        	}
        	//console.log("updating ");
        	//console.log(element);
        	//console.log(changecolour());
        }
    };
});