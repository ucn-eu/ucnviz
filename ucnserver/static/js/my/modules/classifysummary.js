define(['jquery', 'd3', 'ajaxservice', 'knockout', 'moment', 'knockoutpb'], function($,d3,ajaxservice,ko,moment){

	"use strict";

	var

    urls = ko.observableArray(),

    _node_listener = ko.postbox.subscribe("node_changed", function(node) {
			if (node){
				 
			   urls(node.urls.reduce(function(a,b){
						if (a.indexOf(b) < 0) a.push(b);
						return a;
				 },[]));
			}
		})

  return{
    urls: urls
  }

});
