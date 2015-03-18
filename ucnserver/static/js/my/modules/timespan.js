define(['jquery', 'd3', 'ajaxservice', 'knockout', 'moment', 'knockoutpb'], function($,d3,ajaxservice,ko,moment){

	"use strict";
	
	var
		
		margin    = {top:10, right:0, bottom:10,left:50},	
		width 	  = 900 - margin.left - margin.right,
		height    = 50 - margin.top - margin.bottom,
		data,
		filtered,
		xscale,
		
		svg  = d3.select("#timespan").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("clip-path", "url(#clip)")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),	
		
		
		_rangeListener = ko.postbox.subscribe("range", function(range) {
			if (xscale === undefined){
				return;
			}
			
			xscale.domain([new Date(range.fromts * 1000), new Date(range.tots * 1000)])
			render();
		}),
		
		
		_hostListener = ko.postbox.subscribe("host", function(host) {
			console.log(host);
			if (!data)
				return;
			
			
			if (host == null){
				filtered = data.results;
				return;	
			}
			
			filtered = data.results.filter(function (item){
				return item[2] == host;
			});
		}),
				
		render = function(){
			//ok need to filter out hosts then will work!
			
			var points = svg.selectAll("line.datapoint")
							.data(filtered, function(d){return d[0]+""+d[1]+""+d[2]})
							
			points.enter()
				  .append("line")
				  .attr("class", "datapoint")
				
			//update and enter	
			points
				.attr("x1", function(d){return xscale(d[0]*1000)})
				.attr("y1", 0)
				.attr("x2", function(d){return xscale(d[0]*1000)})
				.attr("y2", height)
				.attr("stroke-width", 1)
				.attr("stroke", "#3b5998")
				.on("mousemove", function(d,i){
					console.log(i + ":" + d[2] + " "  + new Date(d[0]*1000) + " " + d[1]);
				});
			
			points.exit()
				  .remove();							
		},
		
		init = function(d){
			data = d;
			filtered = d.results;
			
			xscale  = d3.time.scale()
						.domain([new Date(data.mints*1000), new Date(data.maxts*1000)])
						.range([0,width]);
			
			d3.select("#timespan")
				.select("svg")
				.insert("defs", ":first-child")
				.append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height)	
			
			render();
		}
		
	return {
		init: init,
	}
	
});
