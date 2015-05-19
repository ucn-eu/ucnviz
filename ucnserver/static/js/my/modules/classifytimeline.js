define(['jquery', 'd3', 'ajaxservice', 'knockout', 'moment', 'knockoutpb'], function($,d3,ajaxservice,ko,moment){

	"use strict";

	var


		colours   = ["#3f51b5","#f44336", "#009688"],
		margin    = {top:10, right:0, bottom:10,left:50},
		width 	  = 900 - margin.left - margin.right,
		height    = 100 - margin.top - margin.bottom,
		xscale,

		svg  = d3.select("#timeline").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("clip-path", "url(#clip)")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),

		//"browsing_changed"
		_node_listener = ko.postbox.subscribe("node_changed", function(node) {
			if (node){
				console.log("classify timespan, dispatch listener change");
				console.log(node);
				var d = node.ts.map(function(item, i){
					return [item, node.urls[i]]
				})
				console.log(d);
			}
			//update(d);
		}),

		_hostListener = ko.postbox.subscribe("host", function(host) {

		}),

		render = function(data){

			var points = svg.select("g.points")
							.selectAll("line.datapoint")
							.data(data, function(d){return d[0]+""+d[1]})

			points.enter()
				  .append("line")

			//update and enter
			points
				.attr("x1", function(d){return xscale(d[0]*1000)})
				.attr("y1", height/2)
				.attr("x2", function(d){return xscale(d[0]*1000)})
				.attr("y2", height)
				.attr("stroke-width", 1)
				.attr("stroke", "#607D8b")
				.attr("class", function(d,i){return "datapoint id_" + i})

			points.exit()
				  .remove();

		},


		update = function(d){
			xscale.domain([new Date(data.mints*1000), new Date(data.maxts*1000)]);
			render(d);
		},

		init = function(d){
			xscale  = d3.time.scale()
									.range([0,width]);

			d3.select("#timespan")
				.select("svg")
				.insert("defs", ":first-child")
				.append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height)

			var points = svg.append("g")
							.attr("class", "points");

		}

	return {
		init: init
	}

});
