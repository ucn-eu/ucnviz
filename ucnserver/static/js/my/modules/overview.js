define(['jquery','ajaxservice', 'knockout','d3', 'moment', 'd3.tip','knockoutpb', 'bootstrap'], function($,ajaxservice,ko,d3,moment,d3tip){
	
	"use strict";
	
	var 
	
		svg,
		
		browser,
	
		browsers,
			
		fromto = ko.observableArray([]).publishOn("fromto"),
				
		selectedhost  = ko.observable().publishOn("host"),
		
		timerange	  = ko.observable().syncWith("range"),
		
		calendardate  = ko.observable().syncWith("calendardate"),
			
		selectedquery = ko.observable().publishOn("query"),
		
		shownote	= ko.observable(false),
		
		noterange   = [],
		
		note       =  ko.observable({}),
		
		updatecallback,
		
		_earliest,
		_latest,
		
		_notes	   = [],
		_queries   = [],
		_locations = [],
		_apps = [],
		_device_lookup = {},
		
		_rangeListener = ko.postbox.subscribe("range", function(range) {
			
			
			if (range){
				
				if (range.fromts < _earliest || range.tots > _latest){
					updatecallback([_earliest,_latest], range);
				}else{
					var minfrom 		= (x2.domain()[0]).getTime();
					var maxto   		= (x2.domain()[1]).getTime();
					var selectedfrom 	= range.fromts * 1000;
					var selectedto		= range.tots * 1000;
				
					if (minfrom < selectedfrom && maxto > selectedto){
						zoom.select(".brush").call(brush.extent([new Date(range.fromts*1000), new Date(range.tots*1000)]));
						brushed();
					}else{
						//zoom out!
						d3.select(".brush").call(brush.clear());
					}
				}
			}
		}),
		
		
		_notesListener = ko.postbox.subscribe("notes", function(value){
			if (value)
				overlaynotes(); 
			else{
				svg.selectAll("g.notes").remove();	
				d3.select(".brushnote").call(notebrush.clear());
			}
		}),
		
		_queryListener = ko.postbox.subscribe("queries", function(queries) {
			
			if (queries){
				_queries = queries;
				overlayqueries();
			}
		}),
		
		_locationListener = ko.postbox.subscribe("locations", function(locations) {
			if (locations){
				_locations = locations
				overlaylocations();
			}
		}),
		
		_appListener = ko.postbox.subscribe("apps", function(apps) {
			
			if (apps){
				_apps = apps;
				overlayapps();
			}
		}),
		
		data 	  = [],
		tsdata	  = [],
		filters   = ko.observableArray([]),
		
		margin    = {top:10, right:0, bottom:40,left:50},
		margin2   = {top:20, right:0, bottom:53,left:50},
		
		width 	  = 900 - margin.left - margin.right,
		height    = 350 - margin.top - margin.bottom,
		height2   = 140 - margin2.top - margin2.bottom,
	
		x  = d3.time.scale().range([0,width]),
		x2 = d3.time.scale().range([0, width]),
		 
		y  = d3.scale.linear().range([height,0]),
		y2 = d3.scale.linear().range([height2,0]),
		
		color,
				
		xAxis = d3.svg.axis().scale(x).orient("bottom"),
		xAxis2 = d3.svg.axis().scale(x2).orient("bottom"),
		 
		yAxis = d3.svg.axis().scale(y).orient("left"),
		yAxis2 = d3.svg.axis().scale(y2).orient("left"),
		
		//parseDate = d3.time.format("%Y/%m/%d %H:%M").parse,
		
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
				
		//top level chart containers
		
		svg,
		zoom,
		hostkey,
				
		
		
		
		deviceforhost = function(host){
			return _device_lookup[host].name || host;
		},
		
		locationtip		= d3tip()
					.attr('class', 'd3-tip')
					.offset([-10,0])
					.html(function(d){
						return "<strong>" + d['name'] + "</strong>";
					}),
		
		brushed = function(){
			
			var xrange = brush.empty() ? x2.domain() : brush.extent();
			var from = xrange[0].getTime(); 
			var to   = xrange[1].getTime(); 
			var filtered;
			var labelpadding = 5;
			var labelheight  = 15;
			//recalculate stack values
			if (filters().length > 0){
				filtered = stack(Object.keys(data.hosts).filter(function(value){
					return filters().indexOf(value) != -1
				}).map(function(name){
						return {
							name:name,
							values: data.hosts[name].map(function(d, i){
								return {date:tsdata[i], y:+d};
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
			
			svg.selectAll("rect.locationspan")
						  .attr("x", function(d){return x(d.enter*1000)})  
						  .attr("width" , function(d){return x(d.exit*1000) - x(d.enter*1000)})
	  		
	  		svg.selectAll("rect.appspan")
	  		 				.attr("x", function(d){return x(d.start*1000)})
					 	    .attr("width" , function(d){return x(d.end*1000) - x(d.start*1000)})
	  		
	  		svg.selectAll("rect.applabel")
	  		 				.attr("x", function(d){return x(d.start*1000) + ((x(d.end*1000) - x(d.start*1000))/2) - (d.width/2) - labelpadding})
			
			svg.selectAll("text.apptext")
	  		 				.attr("x", function(d){return x(d.start*1000) + ((x(d.end*1000) - x(d.start*1000))/2)});
			
			svg.selectAll("line.appline")
	  		 				.attr("x1", function(d){return x(d.start*1000) + ((x(d.end*1000) - x(d.start*1000))/2)})
							.attr("x2", function(d){return x(d.start*1000) + ((x(d.end*1000) - x(d.start*1000))/2)});
	  		 			 
			
			
			
			svg.selectAll("line.noteline")
				.attr("x1", function(d){return x(d.fromts*1000) + ((x(d.tots*1000) - x(d.fromts*1000))/2)})
				.attr("x2", function(d){return x(d.fromts*1000) + ((x(d.tots*1000) - x(d.fromts*1000))/2)})	
		
			svg.selectAll("text.notetext")
				.attr("x", function(d){return x(d.fromts*1000) + ((x(d.tots*1000) - x(d.fromts*1000))/2)})
				.attr("y", function(d,i,j){return labelheight/2})
			
			svg.selectAll("rect.notelabel")
				.attr("x", function(d){return x(d.fromts*1000) + ((x(d.tots*1000) - x(d.fromts*1000))/2) - (d.width/2) - labelpadding})
				
							  
			svg.select(".x.axis").call(xAxis);
			svg.select(".y.axis").call(yAxis);
			
		},
		
		notebrushend = function(d){
			if (notebrush.empty() || !selectedhost())
				return;
			
			noterange = notebrush.extent();
			shownote(true);
		},
		
		brushend = function(){
			if (filters().length == 1){
				triggerupdate(filters()[0]);
			}
			calendardate(null);
			updatelocationkey();
		},
		
		subtitle = ko.computed(function(){
			if (fromto().length > 1){
				m1 = moment.unix((fromto()[0].getTime())/1000);
				m2 = moment.unix((fromto()[1].getTime())/1000);
				return (m1.format('MMM Do YYYY h:mm:ss a') + " to " + m2.format('MMM Do YYYY h:mm:ss a'));	
			}
		}),
		
		brush = d3.svg.brush()
    			.x(x2)
    			.on("brush", brushed)
    			.on("brushend", brushend),
    	
    	notebrush = d3.svg.brush()
    			.x(x)
    			.on("brushend", notebrushend),
    	
    	recordnote = function(){
    		shownote(false);
    		var fromts = parseInt(noterange[0].getTime()/1000);
			var tots   = parseInt(noterange[1].getTime()/1000);		
    		var params = {fromts:fromts, tots:tots, host:selectedhost(), note:note().note}
    		ajaxservice.ajaxPostJson('note/add', params, noteadded);
    	},
    	
    	closenote = function(){
    		shownote(false);
    		note({});
    	},
		
		deletenote = function(){
			shownote(false);
			var params = {"id":note().id}
			ajaxservice.ajaxPostJson('note/delete', params, notedeleted);
		},
		
		notedeleted = function(data){
			if (data.success){
			
				var idx = _notes.indexOf(note());
				
				if (idx > -1){
					d3.select(".brushnote").call(notebrush.clear());
					_notes.splice(idx,1)
					note({});
					overlaynotes();
				}
			}
		},
		
		noteadded = function(data){
			if (data.success){
				note({});
				_notes.push(data.note);
				overlaynotes();
				d3.select(".brushnote").call(notebrush.clear());
			}
		},
		
		renderactivity = function(d){
			
			svg.select("defs").remove();
			svg.select("g.topg").remove();
			svg.select("g.axis").remove();
			
			svg.append("defs").append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height);
			
			svg.append("g")
				.attr("class", "topg")
				.attr("width", width)
				.attr("height", height)
					
			data = d;
			
			tsdata = [];
			_earliest = 9999999999;
			_latest = -1;
		
			data.keys.forEach(function(d){
				tsdata.push(d*1000);
				_earliest = Math.min(_earliest, d);
				_latest = Math.max(_latest, d);
			});
			
			browsers = stack(Object.keys(data.hosts).map(function(name){
				
				return {
					name:name,
					values: data.hosts[name].map(function(d, i){
						return {date:tsdata[i], y:+d};
					})
				};
			}));
			
			x.domain(d3.extent(tsdata, function(d){return d}));
			
			fromto(x.domain());
			
			y.domain([0, d3.max(browsers, function(c){
				  return d3.max(c.values, function(d) {return d.y0 +d.y});
			})]);
			
			x2.domain(x.domain());
  			y2.domain(y.domain());
			yAxis2.tickValues(y2.domain());
			
			//var mychart = ;
			
			browser = svg.selectAll("g.topg").selectAll("browser")
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
			  
			 svg.append("g")
				.attr("class", "x brushnote")
				.call(notebrush)
				.selectAll("rect")
				.attr("y", -6)
				.attr("height", height+7);
			
			 svg.append("text")
				  .attr("class", "y label")
				  .attr("transform", "rotate(-90)")
				  .attr("text-anchor", "middle")
				  .attr("y", 0-margin.left)
				  .attr("x", 0 - (height/2))
				  .attr("dy", ".75em")
				  
				  .text("total unique domains requested")
				  	
			renderzoomer(browsers);	
			renderkey();
			
			svg.append("g")
				.attr("class", "queries");
		
		},
		
		updatelocationkey = function(){	
			var xrange = brush.empty() ? x2.domain() : brush.extent();
			var from = xrange[0].getTime()/1000; 
			var to   = xrange[1].getTime()/1000; 
			
			//hostloc.call(locationtip);
			var distinctlocations = [];
			Object.keys(_locations).forEach(function(zone){
				_locations[zone].forEach(function(d){
					if ((d['enter'] > from || d['exit'] > from) && (d['exit'] <= to || d['enter'] <=to)){
						if (distinctlocations.indexOf(d['name']) == -1){
							distinctlocations.push(d['name']);	
						}
					}
				});
			});
			
			renderlocationkey(distinctlocations);
		},
		
		updatekey = function(){
				
			var circles = hostkey.selectAll("circle")
				.data(Object.keys(data.hosts))
					
			circles
				.style("fill-opacity", function(d){return filters().indexOf(d) == -1 ? 0.2 : 1.0});
		},
		
		renderkey = function(){
		
			var padding = 100;
		
			var keys = hostkey.selectAll("g")
				.data(Object.keys(data.hosts));	
				
			keys.enter()
				.append("circle")
				.attr("transform", function(d,i) {return "translate(" + (padding*i) + "," + 0 + ")"; })
				.attr("r", 8)
				.style("fill", function(d){return color(d)})	
				.style("fill-opacity", function(d){return filters().indexOf(d) == -1 ? 0.2 : 1.0})	
				.style("stroke", function(d){return color(d)})	
				.style("stroke-opacity", 1.0)
				.on("click", keyclicked)
				
					 		   
			keys.enter()
				.append("text")
				.attr("class", "key")
				.attr("transform", function(d,i) {return "translate(" + ((padding*i) + 10) + "," + 0 + ")"; })
				.attr("dy", ".35em")
				.text(function(d) { return deviceforhost(d)})
				.on("click", keyclicked)
		
			keys.exit()
				.remove();
		},
		
		renderzoomer = function(data){
			
			zoom.selectAll("g.ztopg").remove();
			
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

		noteclicked = function(d){
			 svg.select(".brushnote").call(notebrush.extent([new Date(d.fromts*1000), new Date(d.tots*1000)]));
			 noterange = notebrush.extent();
			
			 shownote(true);
			 note(d)
		},
		
		keyclicked = function(d){
			updatefilters(d);
		},
		
		areaclicked = function(d){
			updatefilters(d.name);
		},

		updatefilters = function(host){
			var hosts = Object.keys(data.hosts);
			var idx = filters().indexOf(host);
			
			if (idx == -1){
				filters.push(host);
			}else if (hosts.length > 1){
				filters.splice(idx,1);
			}
			
			if (filters().length == 1){
				selectedhost(filters()[0]);
				triggerupdate(filters()[0]);
			}else{
				selectedhost(null);
			}
			
			redraw();
			updatekey();
			redrawoverlays();			
		},
		
		
		redrawoverlays = function(){
			overlayqueries();
			overlaylocations();
			overlayapps();
		},
		/*
		 * Notify other modules if the host has changed OR the selected range has changed.
		 */
		 
		triggerupdate = function(host){
		
			var xrange = brush.empty() ? x2.domain() : brush.extent();
			var from = xrange[0].getTime(); 
			var to   = xrange[1].getTime();
			fromto(xrange);
			
			if (filters().length == 1){		
				timerange({host:host, fromts:parseInt(from/1000), tots:parseInt(to/1000)});
			}
		},
		
		overlayapps= function(){
			
			
			svg.selectAll("g.apps").remove();
			
			var padding =  {top:25, bottom: 5};
			var labelpadding = 5;
			var labelheight  = 15;
			var selected = [];
			
			if (!data || !data.hosts)
				return;
				
			if (filters().length == 0){
				selected = Object.keys(data.hosts);
				//color.domain(Object.keys(data.hosts));
			}else{
				selected = filters();
				//color.domain(filters);
			}
			
			var apps = Object.keys(_apps).map(function(app){
				return {
					name:app,
					values: _apps[app].map(function(d, i){
						return {start:d['start'], end:d['end'], name:d['name']};
					})
				};
			}).filter(function(item){
				return selected.indexOf(item.name) != -1;
			});	
			
			
			var app = svg.append("g")
						  .attr("class", "apps")
						  .attr("width", width)
						   .attr("height", height)
							
			var hostapp = app.selectAll("host")
							.data(apps)
							
			hostapp
					.enter()
					.append("g")
					.attr("class", "host")
						    
						
							
			var line = hostapp.selectAll("apps")
							  .data(function(d,i){return d.values;})
							  
				
				line
					.enter()
					.append("rect")
					.attr("class", "appspan")
					.attr("x", function(d){return x(d.start*1000)})
					.attr("y", function(d,i,j){return (height/selected.length)*j + padding.top})
					.attr("width" , function(d){return x(d.end*1000) - x(d.start*1000)})
					.attr("height", function(d){return (height/selected.length - (padding.top - padding.bottom))})		
					.style("fill", function(d,i,j){return color(d.name)})	
					.style("fill-opacity", function(d){return 0.1})	
					.style("stroke", function(d){return color(d.name)})
					.style("shape-rendering", "crispEdges")		  
			
			
				line	
					.enter()
					.append("line")
					.attr("class", "appline")
					.attr("x1", function(d){return x(d.start*1000) + ((x(d.end*1000) - x(d.start*1000))/2)})
					.attr("x2", function(d){return x(d.start*1000) + ((x(d.end*1000) - x(d.start*1000))/2)})
					.attr("y1", function(d,i,j){return ((height/selected.length)*j + labelheight)})
					.attr("y2", function(d,i,j){return (height/selected.length)*j + padding.top})
					.style("stroke", "#000")	
				
					
				line	
					.enter()
					.append("text")
					.attr("class", "apptext")
					.attr("text-anchor", "middle")
					.attr("dy", ".3em")
					.attr("x", function(d){return x(d.start*1000) + ((x(d.end*1000) - x(d.start*1000))/2)})
					.attr("y", function(d,i,j){return ((height/selected.length)*j) + (labelheight/2)})
					.style("fill", "#000")	
					.text(function(d){return d.name})
					.each(function(d){
						d.width = this.getComputedTextLength();
					})
			
				line	
					.enter()
					.insert("rect", ":first-child")
					.attr("class", "applabel")
					.attr("x", function(d){return x(d.start*1000) + ((x(d.end*1000) - x(d.start*1000))/2) - (d.width/2) - labelpadding})
					.attr("y", function(d,i,j){return ((height/selected.length)*j) + 1})
					.attr("width", function(d,i,j){return d.width + (2*labelpadding)})
					.attr("height", labelheight)
					.style("fill", "#fff")	
					.style("stroke", "#000")
					.style("shape-rendering", "crispEdges")		  
				
		},
		
		
		overlaylocations = function(){
			
			var xrange = brush.empty() ? x2.domain() : brush.extent();
			var from = xrange[0].getTime()/1000; 
			var to   = xrange[1].getTime()/1000; 
			
			//pull out all distinct locations for generating the key
			svg.selectAll("g.locations").remove();			
			svg.selectAll("g.locationkey").remove();
				
			if (Object.keys(_locations).length <= 0){
				
				d3.select("#context").select("svg").attr("height", height+margin.top+margin.bottom);
				
				d3.select(".chartcontainer")
					.transition()
					.duration(1000)
					.style("height", (height+margin.top+margin.bottom) + "px");
			
				d3.select(".leftchart")
					.transition()
					.duration(1000)
					.style("height", "666px");
						
					
				return;
			}
			
		
			var distinctlocations = [];
			
			var rectpadding = 5;
			
			var selected = [];
			if (filters().length == 0){
				selected = Object.keys(data.hosts);
				//color.domain(Object.keys(data.hosts));
			}else{
				selected = filters();
				//color.domain(filters);
			}
			
			
			
			var locations = Object.keys(_locations).map(function(zone){
				return {
					name:zone,
					values: _locations[zone].map(function(d, i){
						//only add key items for locations that are currently shown in chart
						//ie fall within the from to range
							
						if ((d['enter'] > from || d['exit'] > from) && (d['exit'] <= to || d['enter'] <=to)){
							if (distinctlocations.indexOf(d['name']) == -1){
								distinctlocations.push(d['name']);
							}
						}
						return {enter:d['enter'], exit:d['exit'], name:d['name']};
					})
				};
			}).filter(function(item){
				return selected.indexOf(item.name) != -1;
			})
		
			
			var loc = svg.append("g")
						  .attr("class", "locations")
						  .attr("width", width)
						   .attr("height", height)
			
							
			var hostloc = loc.selectAll("host")
							.data(locations)
							
			hostloc
					.enter()
					.append("g")
					.attr("class", "host")
			
			hostloc.call(locationtip);
					    
			var line = hostloc.selectAll("locations")
							  .data(function(d,i){return d.values;})
											  	  
				line
							  .enter()
							  .append("rect")
							  .attr("class", "locationspan")
							  .attr("x", function(d){return x(d.enter*1000)})
					 		  .attr("y", function(d,i,j){return (height/selected.length)*j + rectpadding})
							  .attr("width" , function(d){return x(d.exit*1000) - x(d.enter*1000)})
	  			   			  .attr("height", function(d){return (height/selected.length) - 2*rectpadding})		
							  .style("fill", function(d,i,j){return "url(#lightstripe) #ff0000";})
							  .style("fill-opacity", function(d){return 0.1})	
							  .style("stroke", function(d,i,j){return color(d.name)})	
				 			  .style("stroke-opacity", 1.0)
				
				line
							  .enter()
							  .append("rect")
							  .attr("class", "locationspan")
							  .attr("x", function(d){return x(d.enter*1000)})
					 		  .attr("y", function(d,i,j){return (height/selected.length)*j + rectpadding})
							  .attr("width" , function(d){return x(d.exit*1000) - x(d.enter*1000)})
	  			   			  .attr("height", function(d){return (height/selected.length - 2*rectpadding)})		
							  .style("fill", function(d,i,j){return color(d.name)})	
							  .style("fill-opacity", function(d){return 0.2})	
					 		  .style("stroke", "none")
					 		  .on('mouseover', function(d){locationtip.show(d)})
					 		  .on('mouseout', locationtip.hide)
				
				line 	
							 .enter()
							 .append("line")	
							 .attr("class", "locationline")
				 			 .attr("y1", function(d,i,j){return (height/selected.length)*j})
				 			 .attr("x1", 0)
				 			 .attr("y2", function(d,i,j){return (height/selected.length)*j})
							 .attr("x2", width)
				 			 .style("stroke-dasharray", "4,4")
									
				renderlocationkey(distinctlocations);
				
		},
		
		
		overlaynotes = function(){
			
			
			var labelpadding = 5;
			var labelheight  = 15;
			
			svg.selectAll("g.notes").remove();
			
			var notes = svg.append("g")
						  .attr("class", "notes")
						  .attr("width", width)
						  .attr("height", height)
							
			var note = notes.selectAll("note")
							.data(_notes)
							
			note
				.enter()
				.append("line")
				.attr("class", "noteline")
				.attr("x1", function(d){return x(d.fromts*1000) + ((x(d.tots*1000) - x(d.fromts*1000))/2)})
				.attr("x2", function(d){return x(d.fromts*1000) + ((x(d.tots*1000) - x(d.fromts*1000))/2)})
				.attr("y1", function(d){return labelheight})
				.attr("y2", function(d){return height})
				.style("stroke", "#000")	
		
			note	
				.enter()
				.append("text")
				.attr("class", "notetext")
				.attr("text-anchor", "middle")
				.attr("dy", ".3em")
				.attr("x", function(d){return x(d.fromts*1000) + ((x(d.tots*1000) - x(d.fromts*1000))/2)})
				.attr("y", function(d,i,j){return labelheight/2})
				.style("fill", "#000")	
				.text(function(d){return "note"})
				.each(function(d){
					d.width = this.getComputedTextLength();
				})
				.on("click", noteclicked)	
				
			note	
				.enter()
				.insert("rect", ":first-child")
				.attr("class", "notelabel")
				.attr("x", function(d){return x(d.fromts*1000) + ((x(d.tots*1000) - x(d.fromts*1000))/2) - (d.width/2) - labelpadding})
				.attr("y", function(d){return 0 + 1})
				.attr("width", function(d){return d.width + (2*labelpadding)})
				.attr("height", labelheight)
				.style("fill", "#fff")	
				.style("stroke", "#000")
				.style("shape-rendering", "crispEdges")	
				.on("click", noteclicked)	
		},
		
		renderlocationkey = function(distinctlocations){
				
				svg.selectAll("g.locationkey").remove();
			
				var key =  svg.append("g")
							  .attr("class", "locationkey")
				 			  .selectAll("locationkey")
				 			  .data(distinctlocations);
				
				var _offsets= [0];
				var padding = 16 + 10;
				var lineno = 0;
				
				var linenos = {};
				var offsets = {};
				
				var axispadding = 40;
				var lineheight = 15;
				
				key.enter()
					.append("text")
					.style("fill", "#000")
					.attr("dy", ".3em")
	  				.attr("font-size", "12px")
					.text(function(d){return d})
					.attr("x", function(d,i){
									
									var offset = _offsets.reduce(function(a,b){
										return a+b;
									});
									
									if ( (offset + this.getComputedTextLength()+padding) > width){
										++lineno;
										_offsets = []
										offset = 0;
									}
									_offsets.push(this.getComputedTextLength()+padding);
									linenos[d] = lineno;
									offsets[d] = offset;
									return offset;
								}
					).attr("y", function(d,i){
						return height + axispadding + linenos[d]*lineheight;
					})	
				
				key.enter()
					.append("circle")
					.attr("cx", function(d,i){
							var offset = offsets[d] - 10;
							return offset;
						}
					)
					.attr("cy", function(d,i){return height + axispadding + linenos[d]*lineheight})
					.attr("r", 4)
					.style("fill", function(d){return color(d)});
				
				d3.select("#context").select("svg").attr("height", height+margin.top+margin.bottom+ axispadding + (lineno*lineheight));
				
				d3.select(".chartcontainer")
					.transition()
					.duration(1000)
					.style("height", height + axispadding + (lineno*lineheight) + margin.bottom + "px");	
					
				d3.select(".leftchart")
					.transition()
					.duration(1000)
					.style("height", (636 + (lineno*lineheight) + 30) + "px");
		},
		
		overlayqueries = function(){
			
			/* first must build the lines, then must ovelay! */
			
			
			var l = svg.selectAll(".queries")		
			var lines 	= l.selectAll("line").data(_queries, function(d,i){return i});
			var circles = l.selectAll("circle").data(_queries, function(d,i){return i});		
			
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
			
			var xrange = brush.empty() ? x2.domain() : brush.extent();
			var from = xrange[0].getTime(); 
			var to   = xrange[1].getTime(); 
			
			//selected should be a computed observable based on filters...
			var selected = [];
			
			if (filters().length == 0){
				selected = Object.keys(data.hosts);
			}else{
				selected = filters();
			}
			
			//regenerate the stack values based on the hosts that are currently selected.
			var filtered = stack(selected.map(function(name){
				return {
					name:name,
					values: data.hosts[name].map(function(d, i){
						return {date:tsdata[i], y:+d};
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
			
		},
			
		init = function(data, cf, uc){
			console.log("AM IN GERE!!");
			
			d3.select("#context").select("svg").remove();
			d3.select("#zoom").select("svg").remove();
			d3.select("#activitykey").select("svg").remove();
			
			svg  = d3.select("#context").append("svg")
					 .attr("width", width + margin.left + margin.right)
					 .attr("height", height + margin.top + margin.bottom)
					 .append("g")
					 .attr("class", "mainchart")
					 .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
			zoom = d3.select("#zoom").append("svg")
									 .attr("width", width + margin2.left + margin2.right)
									 .attr("height", height2 + margin2.top + margin2.bottom)
									 .append("g")
					   				 .attr("class", "zoomchart")
					   				 .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");
		
			hostkey = d3.select("#activitykey").append("svg")
											   .attr("width", width + margin.left + margin.right)
												.attr("height",50)
												.append("g")
							 					.attr("transform", "translate(" + margin.left + "," + (margin.top + 10) + ")")
							 					.attr("class", "activitykey");	
			
			if (uc){
				updatecallback = uc;
			}
			
			if (data && data.hosts && Object.keys(data.hosts).length > 0){
				var hosts = Object.keys(data.hosts);
				_device_lookup = data.devices;
				
				if (cf){
					color = cf.colourfor;
				}
				
				renderactivity(data);
				
				if (hosts.length == 1){
					updatefilters(hosts[0]);
				}
				
				_notes = data.notes			
				
			}
			
			d3.select(".chartcontainer").style("height", (height+margin.top+margin.bottom) + "px");
			
		}
		
	return {
		init: init,
		
		subtitle: subtitle,
		//note stuff should sit inside own module...(as should all other overlays)
		deletenote:deletenote,
		shownote: shownote,
		closenote: closenote,
		note: note,
		recordnote:recordnote,
	}
	
});