define(['knockout','modules/dispatcher', 'd3', 'knockoutpb'], function(ko, dispatcher, d3){

	"use strict";

	var

    urls = ko.observableArray(),

		selected = ko.observableArray([]),

		color = d3.scale.category10(),

    _node_listener = ko.postbox.subscribe("node_changed", function(node) {
			if (node){
				 //filter out duplicate urls..
			   urls(node.urls.reduce(function(a,b){
						if (a.indexOf(b) < 0) a.push(b);
						return a;
				 },[]));
				selected([]);
				dispatcher.dispatch("filter_url", selected());
				color.domain(urls);
			}
		}),

		selecturl = function(url){
			var idx = selected.indexOf(url);

			if (idx == -1){
				selected.push(url);
			}else{
				selected.splice(idx, 1)
			}
			dispatcher.dispatch("filter_url", selected());
		},

		colorfor = function(url){
			return color(url);
		}


  return{
    urls: urls,
		selecturl: selecturl,
		selected:selected,
		colorfor: colorfor,
  }

});
