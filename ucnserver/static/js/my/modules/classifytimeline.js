define(['jquery', 'd3', 'ajaxservice', 'knockout', 'moment', 'knockoutpb'], function($,d3,ajaxservice,ko,moment){

	"use strict";

	var

		colours   = ["#3f51b5","#f44336", "#009688"],
		margin    = {top:0, right:0, bottom:40,left:50},
		width 	  = 1300 - margin.left - margin.right,
		height    = 100 - margin.top - margin.bottom,
		xscale,
		xAxis,
		_data,
		_filtered,
		color = d3.scale.category10(),

		svg  = d3.select("#timeline").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("clip-path", "url(#clip)")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),


		//"browsing_changed"
		_node_listener = ko.postbox.subscribe("node_changed", function(node) {
			if (node){
				_data = node.ts.map(function(item, i){
					return [item, node.urls[i]]
				})
				color.domain(_data.map(function(item){return item[1]}));
				_filtered = _data;
				update();
			}
		}),

		_filter_listener = ko.postbox.subscribe("filter_url", function(urls){
			if (urls){
				if (urls.length == 0){
					_filtered = _data;
				}else{
					_filtered = _data.filter(function(item){
							return urls.indexOf(item[1]) != -1;
						});
				}
				update();
			}
		}),

		_hostListener = ko.postbox.subscribe("host", function(host) {

		}),

		render = function(){

			var points = svg.select("g.points")
							.selectAll("line.datapoint")
							.data(_filtered, function(d){return d[0]})

			points.enter()
				  .append("line")

			//update and enter
			points
				.attr("x1", function(d){return d[0] ? xscale(parseInt(d[0])*1000) : 0})
				.attr("y1", height/2)
				.attr("x2", function(d){return d[0] ? xscale(parseInt(d[0])*1000) : 0})
				.attr("y2", height)
				.attr("stroke-width", 2)
				.attr("stroke", function(d){return color(d[1])})
				.attr("class", function(d,i){return "datapoint id_" + i})

			svg.select(".x.axis").transition().duration(1000).call(xAxis);

			points.exit()
				  .remove();

		},


		update = function(){
			var mints = 99999999999;
			var maxts = 0;

			_filtered.forEach(function(val){
				if (val[0]){
				  mints = Math.min(mints, parseInt(val[0]));
			    maxts = Math.max(maxts, parseInt(val[0]));
				}else{
				  console.log("timestamp conversion error:");
			    console.log(val);
				}

			})

			xscale.domain([new Date(mints*1000), new Date(maxts*1000)]);
			xAxis.scale(xscale);
			render();
		},

		init = function(d){


			_data = _filtered = d;



			xscale  = d3.time.scale()
									.range([0,width]);

			xAxis = d3.svg.axis()
										.orient("bottom"),


			/*svg
				.insert("defs", ":first-child")
				.append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height)*/

		svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

		var points = svg.append("g")
							.attr("class", "points");

		}

	return {
		init: init
	}

});
