define(['jquery','ajaxservice', 'knockout','d3', 'moment','knockoutpb'], function($,ajaxservice,ko,d3,moment){
	
	var 
	
		svg,
		
		browser,
	
		
		browsers,
		
		fromto = ko.observableArray([]).publishOn("fromto"),
				
		selectedhost  = ko.observable().publishOn("host"),
		
		timerange	  = ko.observable().syncWith("range"),
			
		selectedquery = ko.observable().publishOn("query"),
		
		_rangeListener = ko.postbox.subscribe("range", function(range) {
			
			if (range){
				minfrom 		= (x2.domain()[0]).getTime();
				maxto   		= (x2.domain()[1]).getTime();
				selectedfrom 	= range.fromts * 1000;
				selectedto		= range.tots * 1000;
				 
				if (minfrom < selectedfrom && maxto > selectedto){
					zoom.select(".brush").call(brush.extent([new Date(range.fromts*1000), new Date(range.tots*1000)]));
				}
			}
		}),
		
		_queryListener = ko.postbox.subscribe("queries", function(queries) {
			if (queries){
				overlayqueries(queries);
			}
		}),
		
		data 	  = [],
		
		filters   = [],
		
		margin    = {top:10, right:0, bottom:80,left:50},
		margin2   = {top:20, right:0, bottom:53,left:50},
		
		width 	  = 1000 - margin.left - margin.right,
		height    = 250 - margin.top - margin.bottom,
		height2   = 140 - margin2.top - margin2.bottom,
	
		x  = d3.time.scale.utc().range([0,width]),
		x2 = d3.time.scale.utc().range([0, width]),
		 
		y  = d3.scale.linear().range([height,0]),
		y2 = d3.scale.linear().range([height2,0]),
		
		color,
				
		xAxis = d3.svg.axis().scale(x).orient("bottom"),
		xAxis2 = d3.svg.axis().scale(x2).orient("bottom"),
		 
		yAxis = d3.svg.axis().scale(y).orient("left"),
		yAxis2 = d3.svg.axis().scale(y2).orient("left"),
		
		parseDate = d3.time.format("%Y/%m/%d %H:%M").parse,
		
		area = d3.svg.area()
				.interpolate("basis")
				.x(function(d) {return x(d.date)})
				.y0(function(d) {return y(d.y0)})
				.y1(function(d) {return y(d.y0 + d.y);}),
		
		area2 = d3.svg.area()
				.interpolate("basis")
				.x(function(d) {return x2(d.date)})
				.y0(function(d) {return y2(d.y0)})
				.y1(function(d) {return y2(d.y0 + d.y);}),
						
		stack = d3.layout.stack()
				.offset("zero")
				.values(function(d) {return d.values})
				.x(function(d){return x(d.date)})
				.y(function(d){return d.y}),
				
		svg  = d3.select("#context").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),		
		
		zoom = d3.select("#zoom").append("svg")
				.attr("width", width + margin2.left + margin2.right)
				.attr("height", height2 + margin2.top + margin2.bottom)
				.append("g")
				.attr("transform", "translate(" + margin2.left + "," + margin2.top + ")"),
		
		key = d3.select("#activitykey").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height",50)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.attr("class", "activitykey"),
		
				
		init = function(data, cf){
			
			if (data && data.hosts && Object.keys(data.hosts).length > 0){
				hosts = Object.keys(data.hosts);
				color = cf.colourfor;
				renderactivity(data);
				if (data.zones){
					overlaylocation(data.zones)
				}
				if (hosts.length == 1){
					updatefilters(hosts[0]);
				}			
			}
			
		},
		
		brushed = function(){
			
			xrange = brush.empty() ? x2.domain() : brush.extent();
			from = xrange[0].getTime(); 
			to   = xrange[1].getTime(); 
			
			var filtered;
			
			//recalculate stack values
			if (filters.length > 0){
				filtered = stack(Object.keys(data.hosts).filter(function(value){
					return filters.indexOf(value) != -1
				}).map(function(name){
						return {
							name:name,
							values: data.hosts[name].map(function(d, i){
								return {date:cdata[i], y:+d};
							})
						};
				}));	
			}else{
				filtered = browsers;	
			}
			
			//check whether host is in the filters array too!
			var max = d3.max(filtered.map(function(host){		
				return d3.max(host.values.filter(function(value){
					return value.date /*.getTime()*/ >= from && value.date /*.getTime()*/ <= to;
				}), function(d){return d.y0+d.y});
			}));
			
			if (max){
				y.domain([0, max]);
			}
			
			x.domain(xrange);
			fromto(x.domain());
			
			svg.selectAll(".area")
				.attr("d", function(d) {return area(d.values);})
				.style("fill", function(d){return color(d.name)})	
			
			var avar = svg.selectAll("rect.locationspan")
						  .attr("x", function(d){return x(d.enter*1000)})  
						  .attr("width" , function(d){return x(d.exit*1000) - x(d.enter*1000)})
	  		 
			svg.select(".x.axis").call(xAxis);
			svg.select(".y.axis").call(yAxis);
			
		},
		
		brushend = function(){
			if (filters.length == 1){
				triggerupdate(filters[0]);
			}
		},
		
		subtitle = ko.computed(function(){
			if (fromto().length > 1){
				m1 = moment.unix((fromto()[0].getTime())/1000);
				m2 = moment.unix((fromto()[1].getTime())/1000);
				return (m1.utc().format('MMM Do YYYY h:mm:ss a') + " to " + m2.utc().format('MMM Do YYYY h:mm:ss a'));	
			}
		}),
		
		brush = d3.svg.brush()
    			.x(x2)
    			.on("brush", brushed)
    			.on("brushend", brushend),
    			
		
		renderactivity = function(d){
			svg.append("defs").append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height);
			
			svg.append("g")
				.attr("class", "topg")
				.attr("width", width)
				.attr("height", height)
				//.append("rect")
				//.attr("class", "cback")
				///.attr("width", width)
				//.attr("height", height);
					
			data = d;
			
			cdata = [];
			
			data.keys.forEach(function(d){
				cdata.push(d*1000);//parseDate(d));
			});
			
			browsers = stack(Object.keys(data.hosts).map(function(name){
				return {
					name:name,
					values: data.hosts[name].map(function(d, i){
						return {date:cdata[i], y:+d};
					})
				};
			}));
			
			x.domain(d3.extent(cdata, function(d){return d}));
			fromto(x.domain());
			
			y.domain([0, d3.max(browsers, function(c){
				  return d3.max(c.values, function(d) {return d.y0 +d.y});
			})]);
			
			x2.domain(x.domain());
  			y2.domain(y.domain());
			yAxis2.tickValues(y2.domain());
			
			mychart = svg.selectAll("g.topg");
			
			browser = mychart.selectAll("browser")
					.data(browsers)
					.enter().append("g")
					.attr("class", "browser")
					
			browser.append("path")
				.attr("class", "area")
				.attr("d", function(d) {return area(d.values);})
				.style("fill", function(d){return color(d.name)})
				.style("fill-opacity", 0.2)	
				.style("stroke", function(d){return color(d.name)})	
				.style("stroke-opacity", 1.0)
				.on("click", areaclicked);
			
			 svg.append("g")
				  .attr("class", "x axis")
				  .attr("transform", "translate(0," + height + ")")
				  .call(xAxis);

			 svg.append("g")
				  .attr("class", "y axis")
				  .call(yAxis);
			  
			renderzoomer(browsers);	
			renderkey();
			
			svg.append("g")
				.attr("class", "queries");
		
		},
		
		
		updatekey = function(){
				
			var circles = key.selectAll("circle")
				.data(Object.keys(data.hosts))
					
			circles
				.style("fill-opacity", function(d){return filters.indexOf(d) == -1 ? 0.2 : 1.0});
		}
		
		renderkey = function(){
		
			var padding = 100;
			
			var keys = key.selectAll("g")
				.data(Object.keys(data.hosts))
			
			//add new	
				
			keys.enter()
				.append("circle")
				.attr("transform", function(d,i) {return "translate(" + (padding*i) + "," + 0 + ")"; })
				.attr("r", 8)
				.style("fill", function(d){return color(d)})	
				.style("fill-opacity", function(d){return filters.indexOf(d) == -1 ? 0.2 : 1.0})	
				.style("stroke", function(d){return color(d)})	
				.style("stroke-opacity", 1.0)
				.on("click", keyclicked);
				  
			keys.enter()
				.append("text")
				.attr("class", "key")
				.attr("transform", function(d,i) {return "translate(" + ((padding*i) + 10) + "," + 0 + ")"; })
				.attr("dy", ".35em")
				.text(function(d) { return d; })
				.on("click", keyclicked);
		},
		
		renderzoomer = function(data){
			
			zoom.append("g")
				.attr("class", "ztopg")
				.attr("width", width)
				.attr("height", height2)
				.append("rect")
				.attr("class", "cback")
				.attr("width", width)
				.attr("height", height2);
				
			
			var mychart = zoom.selectAll("g.ztopg")
				
			var zbrowser = mychart.selectAll(".zbrowser")
					.data(browsers)
					.enter().append("g")
					.attr("class", "zbrowser");
					
			zbrowser.append("path")
				.attr("class", "area")
				.attr("d", function(d) {return area2(d.values);})
				.style("fill", function(d){return color(d.name)})
				.style("fill-opacity", 0.2)	
				.style("stroke", function(d){return color(d.name)})	
				.style("stroke-opacity", 1.0)
				.on("click", areaclicked);
				
	
			zoom.append("g")
				  .attr("class", "x axis")
				  .attr("transform", "translate(0," + height2 + ")")
				  .call(xAxis2);
			
			zoom.append("g")
				  .attr("class", "y axis")
				  .call(yAxis2);
			
			zoom.append("g")
				.attr("class", "x brush")
				.call(brush)
				.selectAll("rect")
				.attr("y", -6)
				.attr("height", height2 + 7);
			 
		},

		keyclicked = function(d){
			updatefilters(d);
		},
		
		areaclicked = function(d){
			updatefilters(d.name);
		},

		updatefilters = function(host){
		
			var idx = filters.indexOf(host);
			
			if (idx == -1){
				filters.push(host);
			}else if (hosts.length > 1){
				filters.splice(idx,1);
			}
			
			if (filters.length == 1){
				selectedhost(filters[0]);
				triggerupdate(filters[0]);
			}
			
			redraw();
		
			updatekey();			
		},
		
		/*
		 * Notify other modules if the host has changed OR the selected range has changed.
		 */
		 
		triggerupdate = function(host){
		
			xrange = brush.empty() ? x2.domain() : brush.extent();
			from = xrange[0].getTime(); 
			to   = xrange[1].getTime();
			fromto(xrange);
		
			if (filters.length == 1){
				timerange({host:host, fromts:parseInt(from/1000), tots:parseInt(to/1000)});
			}
		},
		
		
		overlaylocation = function(zones){
		
			rectpadding = 5;
			
			locations = Object.keys(zones).map(function(zone){
				return {
					name:zone,
					values: zones[zone].map(function(d, i){
						return {enter:d['enter'], exit:d['exit'], name:d['name']};
					})
				};
			});	
			
			var loc = svg.append("g")
						  .attr("class", "locations")
						  .attr("width", width)
						   .attr("height", height)
							
			var hostloc = loc.selectAll("host")
							.data(locations)
							.enter()
							.append("g")
							.attr("class", "host")
						    
						
							
			var line = hostloc.selectAll("locations")
							  .data(function(d,i){return d.values;})
							  .enter()
							  
							  
				line.append("rect")
							  .attr("class", "locationspan")
							  .attr("x", function(d){return x(d.enter*1000)})
					 		  .attr("y", function(d,i,j){return (height/Object.keys(zones).length)*j + rectpadding})
							  .attr("width" , function(d){return x(d.exit*1000) - x(d.enter*1000)})
	  			   			  .attr("height", function(d){return (height/Object.keys(zones).length) - 2*rectpadding})		
							  .style("fill", function(d,i,j){return "url(#lightstripe) #ff0000";})
							  .style("fill-opacity", function(d){return 0.1})	
							  .style("stroke", function(d,i,j){return color(d.name)})	
				 			  .style("stroke-opacity", 1.0)
				
				line.append("rect")
							  .attr("class", "locationspan")
							  .attr("x", function(d){return x(d.enter*1000)})
					 		  .attr("y", function(d,i,j){return (height/Object.keys(zones).length)*j + rectpadding})
							  .attr("width" , function(d){return x(d.exit*1000) - x(d.enter*1000)})
	  			   			  .attr("height", function(d){return (height/Object.keys(zones).length - 2*rectpadding)})		
							  .style("fill", function(d,i,j){return color(d.name)})	
							  .style("fill-opacity", function(d){return 0.2})	
					 			.style("stroke", "none")
				
				line.append("line")	
							 .attr("class", "locationline")
				 			 .attr("y1", function(d,i,j){return (height/Object.keys(zones).length)*j})
				 			 .attr("x1", 0)
				 			 .attr("y2", function(d,i,j){return (height/Object.keys(zones).length)*j})
							 .attr("x2", width)
				 			 .style("stroke-dasharray", "4,4")
				 			 
									
				
		},
		
		overlayqueries = function(queries){
			
			/* first must build the lines, then must ovelay! */
			
			
			l = svg.selectAll(".queries")
						
						
			lines 	= l.selectAll("line").data(queries, function(d,i){return i});
			circles = l.selectAll("circle").data(queries, function(d,i){return i});		
			
			lines
				.transition()	
			 	.attr("y1", 6)
				.attr("x1", function(d){return x(d.ts*1000)})
				.attr("y2", height)
				.attr("x2", function(d){return x(d.ts*1000)});
		
			lines
				.enter()
				 .append("line")
				 .attr("class", "divide")
				 .attr("y1", 6)
				 .attr("x1", function(d){return x(d.ts*1000)})
				 .attr("y2", height)
				 .attr("x2", function(d){return x(d.ts*1000)})
				 .style("stroke", function(d){return "#000000"})
			 	 .style("stroke-opacity", 1.0);
			
			circles.transition()
				 .attr("cx", function(d) {return x(d.ts*1000)});
			
			circles.enter()
				 .append("circle")
				 .attr("cx", function(d) {return x(d.ts*1000)})
				 .attr("cy", function(d) {return 0})
				 .attr("r", 6)
				 .style("fill", function(d){return "#f59946"})	
				 .style("fill-opacity", function(d){return 0.4})	
				 .style("stroke", function(d){return "#f59946"})	
				 .style("stroke-opacity", 1.0)
				 .on("mouseover", queryselected)
				 .on("mouseout", querydeselected);
				 
			lines.exit()
				.remove();
				
			circles.exit()
				.remove();	
		},
		
		queryselected = function(d){
			selectedquery(d);
		},
		
		querydeselected = function(d){
			selectedquery("");
		},
				
		redraw = function(){
			
			xrange = brush.empty() ? x2.domain() : brush.extent();
			from = xrange[0].getTime(); 
			to   = xrange[1].getTime(); 
			
			selected = [];
			if (filters.length == 0){
				selected = Object.keys(data.hosts);
				//color.domain(Object.keys(data.hosts));
			}else{
				selected = filters;
				//color.domain(filters);
			}
			
			//regenerate the stack values based on the hosts that are currently selected.
			var filtered = stack(selected.map(function(name){
				return {
					name:name,
					values: data.hosts[name].map(function(d, i){
						return {date:cdata[i], y:+d};
					})
				};
			}));
			
			//set the y values from 0 to recalculated max y (based on calculating each stack height)
			y.domain([0,d3.max(filtered.map(function(host){		
				return d3.max(host.values.filter(function(value){
					return value.date >= from && value.date <= to;
				}), function(d){return d.y0+d.y});
			}))]);
			
			y2.domain([0,d3.max(filtered.map(function(host){		
				return d3.max(host.values, function(d){return d.y0+d.y});
			}))]);
			
			yAxis2.tickValues(y2.domain());
			
			//------------ update paths! ------------
			
			var activity = svg.selectAll(".area")	
					.data(filtered)
			
			
			//update current elements
			activity
					.transition()
					.duration(1000)
					.attr("d", function(d) {return area(d.values);})
					.style("fill", function(d){return color(d.name)})	
					.style("fill-opacity", 0.2)	
					.style("stroke", function(d){return color(d.name)})	
					.style("stroke-opacity", 1.0)						
			
			//handle new data!
			activity
						.enter()
						.append("g")
						.attr("class", "browser")
						.each(function(d,idx){
							d3.select(this).append("path")
							  .attr("class", "area")
							  .attr("d", function(d) {return area(d.values);})
							  .style("fill", function(d){return color(d.name)})
							  .style("fill-opacity", 0.2)	
							  .style("stroke", function(d){return color(d.name)})	
							  .style("stroke-opacity", 1.0)
							  .on("click", areaclicked)
								
							/*d3.select(this).append("circle")
			   				  .attr("transform", function(d) {return "translate(" + (width-100) + "," + (20*idx) + ")"; })
			   				  .attr("r", 8)
			   				  .style("fill", function(d){return staticcolor[d.name]});
			   				  
			   				 d3.select(this).append("text")
			   				  .attr("transform", function(d) {return "translate(" + (width-70) + "," + (20*idx) + ")"; })
			   				 .text(function(d) { return d.name});*/
						});
						
		
			activity.exit().each(function(){d3.select(this.parentNode).remove();});
			
			
			
			/* update zoom graph too! */
			var azoom = zoom.selectAll(".area")	
					.data(filtered)
			
			
			//update current elements
			azoom
					.transition()
					.duration(1000)
					.attr("d", function(d) {return area2(d.values);})
					.style("fill", function(d){return color(d.name)})	
					.style("fill-opacity", 0.2)	
					.style("stroke", function(d){return color(d.name)})	
					.style("stroke-opacity", 1.0)						
			
			//handle new data!
			azoom
						.enter()
						.append("g")
						.attr("class", "browser")
						.each(function(d,idx){
							d3.select(this).append("path")
							  .attr("class", "area")
							  .attr("d", function(d) {return area2(d.values);})
							  .style("fill", function(d){return color(d.name)})
							  .style("fill-opacity", 0.2)	
							  .style("stroke", function(d){return color(d.name)})	
							  .style("stroke-opacity", 1.0)
						});
						
		
			azoom.exit().each(function(){d3.select(this.parentNode).remove();});
				 
					 
			//adjust y-axis!
			var yaxis = svg.select(".y.axis")
			var y2axis = zoom.select(".y.axis")
			
			yaxis.transition()
				.duration(1000)
				.call(yAxis);
				
			y2axis.transition()
				.duration(1000)
				.call(yAxis2);
			
		}
		
	return {
		init: init,
		subtitle: subtitle,
		
	}
	
});