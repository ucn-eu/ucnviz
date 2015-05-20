define(['jquery', 'd3', 'ajaxservice', 'knockout', 'moment', 'knockoutpb'], function($,d3,ajaxservice,ko,moment){

	"use strict";

	var

    title = ko.observable("browsing"),

    _node_listener = ko.postbox.subscribe("node_changed", function(node) {
			if (node){
				console.log("node name is ");
				console.log(node.name);
			   title(node.name);
			}
		})

  return{
    title: title
  }

});
