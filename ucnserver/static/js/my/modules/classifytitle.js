define(['jquery', 'd3', 'ajaxservice', 'knockout', 'moment', 'knockoutpb'], function($,d3,ajaxservice,ko,moment){

	"use strict";

	var

    title = ko.observable("browsing"),

		percentage = ko.observable("100% of all categorised browsing"),

    _node_listener = ko.postbox.subscribe("node_changed", function(node) {
			if (node){
			  title(node.name);
				percentage(node.percentage + "% of all categorised browsing");
			}
		})

  return{
    title: title,
		percentage: percentage
  }

});
