define(['jquery','ajaxservice', 'knockout','d3'], function($,ajaxservice,ko,d3){
	
	var 
	
		svg,
		
		browser,
		
		browsers,
		
		data 	  = [],
		
		filters   = [],
		
		margin    = {top:20, right:100, bottom:50,left:50},
		
		width 	  = 870 - margin.left - margin.right,
		
		height    = 300 - margin.top - margin.bottom,
		height2   = 150 - margin.top - margin.bottom,
	
		x  = d3.time.scale().range([0,width]),
		x2 = d3.time.scale().range([0, width]),
		 
		y  = d3.scale.linear().range([height,0]),
		y2 = d3.scale.linear().range([height2,0]),
		
		color = d3.scale.category20(),
		staticcolor = {},
		
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
				.attr("width", width + margin.left + margin.right)
				.attr("height", height2 + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
		
		init = function(data){
			hosts = Object.keys(data.hosts);
			color.domain(hosts);
		
			for (i = 0; i < hosts.length; i++){
				staticcolor[hosts[i]] = color(hosts[i]);
			}
			renderactivity(data);			
		},
		
		brushed = function(){
			
			xrange = brush.empty() ? x2.domain() : brush.extent();
			from = xrange[0].getTime(); 
			to   = xrange[1].getTime(); 
		
			max = d3.max(browsers.map(function(hosts){
				return d3.max(hosts.values.filter(function(value){
					return value.date.getTime() >= from && value.date.getTime() <= to;
				}), function(d){return d.y0+d.y});
			}));
			if (max)
				y.domain([0, max]);
			x.domain(xrange);
	
			svg.selectAll(".area")
				.attr("d", function(d) {return area(d.values);})
				.style("fill", function(d){return staticcolor[d.name]})	
			
			svg.select(".x.axis").call(xAxis);
			svg.select(".y.axis").call(yAxis);
			
		},
		
		brush = d3.svg.brush()
    			.x(x2)
    			.on("brush", brushed),
    			
		
		renderactivity = function(d){
			svg.append("defs").append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height);
				
			data = d;
			
			cdata = [];
			
			data.keys.forEach(function(d){
				cdata.push(parseDate(d));
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
			
			y.domain([0, d3.max(browsers, function(c){
				  return d3.max(c.values, function(d) {return d.y0 +d.y});
			})]);
			
			x2.domain(x.domain());
  			y2.domain(y.domain());
			
			browser = svg.selectAll("browser")
					.data(browsers)
					.enter().append("g")
					.attr("class", "browser")
					
			browser.append("path")
				.attr("class", "area")
				.attr("d", function(d) {return area(d.values);})
				.style("fill", function(d){return staticcolor[d.name]})
				.style("fill-opacity", 0.2)	
				.style("stroke", function(d){return staticcolor[d.name]})	
				.style("stroke-opacity", 1.0)
				.on("click", areaclicked);
			
			browser.append("circle")
				  .attr("transform", function(d,i) {return "translate(" + (width-100) + "," + (20*i) + ")"; })
				  .attr("r", 8)
				  .style("fill", function(d){return staticcolor[d.name]})	
				  
			browser.append("text")
				  .attr("transform", function(d,i) {return "translate(" + (width-70) + "," + (20*i) + ")"; })
				  .attr("dy", ".35em")
				  .text(function(d) { return d.name; });

			 svg.append("g")
				  .attr("class", "x axis")
				  .attr("transform", "translate(0," + height + ")")
				  .call(xAxis);

			  svg.append("g")
				  .attr("class", "y axis")
				  .call(yAxis);
				  
			   renderzoomer(browsers);	
		},
		
		
		renderzoomer = function(data){
			
			
				
			var zbrowser = zoom.selectAll(".zbrowser")
					.data(browsers)
					.enter().append("g")
					.attr("class", "zbrowser");
					
			zbrowser.append("path")
				.attr("class", "area")
				.attr("d", function(d) {return area2(d.values);})
				.style("fill", function(d){return staticcolor[d.name]})	
				.on("click", areaclicked);
				
	
			zoom.append("g")
				  .attr("class", "x axis")
				  .attr("transform", "translate(0," + height2 + ")")
				  .call(xAxis2);
			
			zoom.append("g")
				.attr("class", "x brush")
				.call(brush)
				.selectAll("rect")
				.attr("y", -6)
				.attr("height", height2 + 7);
			 
		},


		areaclicked = function(d){
			
			
			if (filters.indexOf(d.name) == -1){
				filters.push(d.name);
			}else{
				filters = []
			}
			
			redraw(data);
		},
		
		redraw = function(){
			
			
			
			if (filters.length == 0){
				color.domain(Object.keys(data.hosts));
			}else{
				color.domain(filters);
			}
			
			filtered = stack(color.domain().map(function(name){
				return {
					name:name,
					values: data.hosts[name].map(function(d, i){
						return {date:cdata[i], y:+d};
					})
				};
			}));
			
			y.domain([0, d3.max(filtered, function(c){
				  return d3.max(c.values, function(d) {return d.y0 +d.y});
			})]);
					
					
			//-------- update the key ------------
			
			
			var key = svg.selectAll(".browser")	
						.data(filtered)
								
			key.select("text")
						.attr("transform", function(d,i) {return "translate(" + (width-70) + "," + (20*i) + ")"; })
				  		.text(function(d) { return d.name});
			
			key.select("circle")
				  	.attr("transform", function(d,i) {return "translate(" + (width-100) + "," + (20*i) + ")"; })
				  	.attr("r", 8)
				  	.style("fill", function(d){return staticcolor[d.name]})	
					
			
			   
			//deal with removals!
			
			//key.exit().call(function(d){console.log('removing'); console.log(d)});
			//key.exit().remove();
			   
			//------------ update paths! ------------
			
			var activity = svg.selectAll(".area")	
					.data(filtered)
			
			
			//update current elements
			activity
					.transition()
					.duration(1000)
					.attr("d", function(d) {return area(d.values);})
					.style("fill", function(d){return staticcolor[d.name]})	
					.style("fill-opacity", 0.2)	
					.style("stroke", function(d){return staticcolor[d.name]})	
					.style("stroke-opacity", 1.0)						
				
			//handle new data!
			//handle new data!
			activity
						.enter()
						.append("g")
						.attr("class", "browser")
						.each(function(d,idx){
							d3.select(this).append("path")
							  .attr("class", "area")
							  .attr("d", function(d) {return area(d.values);})
							  .style("fill", function(d){return staticcolor[d.name]})
							  .style("fill-opacity", 0.2)	
							  .style("stroke", function(d){return staticcolor[d.name]})	
							  .style("stroke-opacity", 1.0)
							  .on("click", areaclicked)
								
							d3.select(this).append("circle")
			   				  .attr("transform", function(d) {return "translate(" + (width-100) + "," + (20*idx) + ")"; })
			   				  .attr("r", 8)
			   				  .style("fill", function(d){return staticcolor[d.name]});
			   				  
			   				 d3.select(this).append("text")
			   				  .attr("transform", function(d) {return "translate(" + (width-70) + "," + (20*idx) + ")"; })
			   				 .text(function(d) { return d.name});
						});
						
		
			activity.exit().each(function(){d3.select(this.parentNode).remove();});
				 
					 
			//adjust y-axis!
			var yaxis = svg.select(".y.axis")
			 
			yaxis.transition()
				.duration(1000)
				.call(yAxis);
			
		}
		
	return {
		init: init
	}
	
});