define(['jquery','ajaxservice', 'knockout','d3','nvd3'], function($,ajaxservice,ko,d3,nv){
	
	var 
	
		svg,
		
		margin    = {top:20, right:20, bottom:30,left:50},
		
		width 	  = 960 - margin.left - margin.right,
		
		height    = 500 - margin.top - margin.bottom,
		
	
		
		x = d3.time.scale().range([0,width]),
		
		y = d3.scale.linear().range([height,0]),
		
		color = d3.scale.category20(),
		
		xAxis = d3.svg.axis().scale(x).orient("bottom"),
		
		yAxis = d3.svg.axis().scale(y).orient("left"),
		
		
		area = d3.svg.area()
				.x(function(d) {return x(d.date)})
				.y0(function(d) {return y(d.y0)})
				.y1(function(d) {return y(d.y0 + d.y);}),
				
		stack = d3.layout.stack()
				.values(function(d) {return d.values}),
				
		
		svg  = d3.select("#overview").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
		
		
		init = function(data){
			renderactivity(data);			
		},
		
		renderactivity = function(data){
			parseDate = d3.time.format("%Y/%m/%d %H:%M").parse;
			
			color.domain(Object.keys(data.hosts));
			
			cdata = [];
			
			data.keys.forEach(function(d){
				cdata.push({date:parseDate(d)});
			});
			
			
			
			x.domain(d3.extent(cdata, function(d){return d.date}));
			
			
			browsers = stack(color.domain().map(function(name){
				return {
					name:name,
					values: data.hosts[name].map(function(d, i){
						return {date:cdata[i].date, y:+d};
					})
				};
			}));
			
			
			
			y.domain([0, d3.max(browsers, function(c){
				  return d3.max(c.values, function(d) {return d.y0 + d.y});
			})]);
				  
	
			
			var browser = svg.selectAll(".browser")
					.data(browsers)
					.enter().append("g")
					.attr("class", "browser");
			
			browser.append("path")
				.attr("class", "area")
				.attr("d", function(d) {return area(d.values);})
				.style("fill", function(d){return color(d.name)});		
			
			 browser.append("text")
				  .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
				  .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.y0 + d.value.y / 2) + ")"; })
				  .attr("x", -6)
				  .attr("dy", ".35em")
				  .text(function(d) { return d.name; });

			  svg.append("g")
				  .attr("class", "x axis")
				  .attr("transform", "translate(0," + height + ")")
				  .call(xAxis);

			  svg.append("g")
				  .attr("class", "y axis")
				  .call(yAxis);
		},
		
		
		nvd3graph = function(){
			
			nv.addGraph(function() {
				
				//have to pad with 0s!!
				
				var chart = nv.models.stackedAreaChart()
							  .margin({right: 100})
							  .x(function(d) { return d[0] *1000})   //We can modify the data accessor functions...
							  .y(function(d) { return d[1]  })   //...in case your data is formatted differently.
							  .useInteractiveGuideline(true)    //Tooltips which show all data points. Very nice!
							  .rightAlignYAxis(true)      //Let's move the y-axis to the right side.
							  .transitionDuration(500)
							  .showControls(false)       //Allow user to choose 'Stacked', 'Stream', 'Expanded' mode.
							  .clipEdge(true);

				//Format x-axis labels with custom function.
				chart.xAxis
					.tickFormat(function(d) { 
					  return d3.time.format('%x')(new Date(d)) 
				});

				chart.yAxis
					.tickFormat(d3.format(',.0f'));

				//add the chart to the dom and provide with data!
				
				d3.select('#chart svg')
				  .datum(data)
				  .call(chart);

				nv.utils.windowResize(chart.update);

				return chart;
			});			
		}	
		
	return {
		init: init
	}
	
});