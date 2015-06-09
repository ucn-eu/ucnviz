define(['knockout', 'knockoutpb'], function(ko){
	var

    dispatch = function(topic, value){
        ko.postbox.publish(topic, value);
    }

  return {
    dispatch: dispatch
  }

});
