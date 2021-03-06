define(['jquery', 'd3', 'ajaxservice', 'knockout', 'moment', 'knockoutpb'], function($,d3,ajaxservice,ko,moment){

	"use strict";
	
	var
	
		timerange	  = ko.observable().syncWith("range"),
		
		colours   = ["#3f51b5","#f44336", "#009688"],
		
		margin    = {top:10, right:0, bottom:10,left:50},	
		width 	  = 900 - margin.left - margin.right,
		height    = 100 - margin.top - margin.bottom,
		currenthost,
		data,
		filtered,
		xscale,
		brush,
		
		lines = [null,null,null],
		
		svg  = d3.select("#timespan").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("clip-path", "url(#clip)")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),	
		
		//"browsing_changed"
		_dispatch_listener = ko.postbox.subscribe("browsing_changed", function(range) {
			console.log("timespan, dispatch listener change");
			if (xscale === undefined){
				return;
			}
			
			var from = new Date(range.fromts * 1000);
			var to = new Date(range.tots * 1000);
			
			if (xscale.domain()[0] == from && xscale.domain()[1] == to){
				return;
			}
			
			xscale.domain([from, to]);
			svg.select(".brush").call(brush.clear());
			render();
		}),	
		
		_hostListener = ko.postbox.subscribe("host", function(host) {
			
			currenthost = host;
			
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
			
			
			var points = svg.select("g.points")
							.selectAll("line.datapoint")
							.data(filtered, function(d){return d[0]+""+d[1]+""+d[2]})
							
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
				.on("mousemove", function(d,i){
					if (lines.length == 3){
						lines.forEach(function(line){
							if (line!=null)
								line.attr("stroke", "#607D8b")
						});
					}
					
					lines[0] = d3.select("line.id_" + (i-1))
								.attr("stroke", colours[0]);
								
					lines[1] = d3.select("line.id_" + i)
								.attr("stroke", colours[1]);
					
					lines[2] = d3.select("line.id_" + (i+1))
								.attr("stroke", colours[2]);
					
					if (i > 0)
						d3.select("text.txt_0").text(filtered[i-1][1])
					
					d3.select("text.txt_1").text(d[1])
					
					if (i < filtered.length-1)	
						d3.select("text.txt_2").text(filtered[i+1][1])
									
				});
			
			points.exit()
				  .remove();
				  				
		},
		
		brushend = function(){
			var xrange = brush.empty() ? xscale.domain() : brush.extent();
			var from = xrange[0].getTime(); 
			var to   = xrange[1].getTime();
			if (currenthost){
				timerange({host:currenthost, fromts:parseInt(from/1000), tots:parseInt(to/1000)});
			}
		},
		
		update = function(d){
			data = d;
			filtered = d.results;
			
			xscale  = d3.time.scale()
						.domain([new Date(data.mints*1000), new Date(data.maxts*1000)])
						.range([0,width]);
			
			brush.x(xscale);
			lines = [null,null,null];
			render();
		},				
		 					
		init = function(d){
			data = d;
			filtered = d.results;
			
			xscale  = d3.time.scale()
						.domain([new Date(data.mints*1000), new Date(data.maxts*1000)])
						.range([0,width]);
						
			brush = d3.svg.brush()
		 				.x(xscale)
		 				.on("brushend", brushend);
		
			d3.select("#timespan")
				.select("svg")
				.insert("defs", ":first-child")
				.append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height)	
			
			var labeldata = ["previous url","current url", "next url"];
			
			var tscale = d3.scale.linear()
							.domain([0,2])
							.range([width/4,width-width/4]);
			
			var mybrush = svg.append("g")
							.attr("class", "x brush")
							.call(brush)
							.selectAll("rect")
							.attr("y", (height/2) - 6)
							.attr("height", (height/2)+7);				
			
			var labels = svg
							.append("g")
							.attr("class", "labels")
							.selectAll("text.label")
			   				.data(labeldata)
			   				.enter()
			   				.append("text")
			   				.attr("class", function(d,i){return "label txt_" + i})
			   				.attr("x", function(d,i){
			   						return tscale(i)
			   				})
			   				.attr("y", height / 4)
			   				.style("fill", function(d,i){return colours[i]})
			   				.text(function(d){return d})
			
			var points = svg.append("g")
							.attr("class", "points");	
			
				
			
			render();
		}
		
	return {
		init: init,
		update: update,
	}
	
});
