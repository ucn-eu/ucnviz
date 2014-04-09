define(['ajaxservice','flotr'], function(ajaxservice){

    var
    	container = document.getElementById("squidgraph"),
            
        parameters = [],
          
        selectcallback, clickcallback,
	
		createzoomchart = function(from,depth,netdata){
			traffic = netdata.traffic;			
			unitwidth = 5;
			readings = [];
			labels = [];
			data = [];
			id = 0;
			markers = [];
			yticks = [];
			max = 30;
			timeline = {
            	show: true,
            	barWidth: 0.5,
        	};
			/* start point, id, len */
			/* calculates the horizontal widths based on the difference between the ma and min start points
			   means need at least one different start point, with big difference*/
			
			
			for (i = 0; i < traffic.length; i++){
				start = parseInt(traffic[i].ts) - from; 
				idx = labels.indexOf(traffic[i].url);
				if (idx == -1){
					readings.push([[start*unitwidth,id++,unitwidth]]);
					labels.push(traffic[i].url);
				}else{
					readings[idx].push([start*unitwidth,idx,unitwidth]);
				} 
			}
			
		
				
			// Timeline
			Flotr._.each(readings.slice(0,max), function(d) {
				data.push({
					data: d,
					timeline: Flotr._.clone(timeline)
				});
			});

			// Markers
			Flotr._.each(readings.slice(0,max), function(d) {
				
				point = d[0];
				if (point)
				markers.push([point[0], point[1]]);
			});
	
			
			for (i = 0; i < labels.length; i++){
				yticks[i] = [i,labels[i]];
			}
		
			graph = Flotr.draw(container, data, {
				xaxis: {
					noTicks: 10,
					tickFormatter: function(x) {
						return parseInt(x) / unitwidth;
					}
				},
				yaxis: {
            		ticks: yticks,
					showLabels: true,
				},
				grid: {
					horizontalLines: false,
					minorVerticalLines: true
				},
				selection: {
					mode: 'y'
				},
			});
			
			attachObservers(
				function(area){
				},
				function(){
					ajaxservice.ajaxGetJson('summary', parameters[depth-1], curry(renderroot, depth-1));	
				}
			);
		},
			
		attachObservers = function(selectcbk, clickcbk){
			
			if (selectcallback){
				Flotr.EventAdapter.stopObserving(container, 'flotr:select', selectcallback);
			}
			if (clickcallback){
				Flotr.EventAdapter.stopObserving(container, 'flotr:click', clickcallback);
			}
			
			if (selectcbk){
				selectcallback = function(area) {
					selectcbk(area);		
				};
				Flotr.EventAdapter.observe(container, 'flotr:select', selectcallback);
			}
			
			if (clickcbk){
				clickcallback = function(pos) {	
					clickcbk(pos);
				};
				// When graph is clicked, draw the graph with default area.
				Flotr.EventAdapter.observe(container, 'flotr:click', clickcallback);  
			}
		},
		
		renderroot = function(depth, data){
			var 
    			d1 = [],
    			i, x, o;
			
			summary = data.summary;
			
			for (i = 0; i < summary.length; i++){
				d1.push([new Date(summary[i][0]).getTime(), summary[i][1]]);
			}
			
			barwidths = [60*60*24*1000,60*60*1000,60*1000]
			
			opts = {
				bars: {
					show: true,
					horizontal: false,
					shadowSize: 0,
					barWidth: barwidths[depth],
				},
				mouse: {
					track: true,
					relative: true
				},
				xaxis: {
					mode: 'time',
            		labelsAngle: 45
				},
				grid:{
					 horizontalLines: true,
				},
				yaxis: {
				
				},
				selection: {
					mode: 'x'
				},

				title: 'Household browsing',
        		subtitle: 'sites visited'
			}
			
			// Draw the graph
			Flotr.draw(container, [d1], opts);
			
			attachObservers(
				//select
				function(area){
					//ajaxservice.ajaxGetJson('range' ,{ host: "10.8.0.2" }, fetchdata);
				},
				
				function(position){
					barmultiplier 	= [12*60*60*1000, 30*60*1000, 30*1000];
					torange 		= [60*60*24,60*60,60];
					 
					if (depth <= 2){
						//bar multiplier ensures that the mouse x coords and bar match up
						date = new Date(parseInt(position.x + barmultiplier[depth]));
						//normalised date strips away unrequired detail (i.e. minutes or hours, depending on depth)
						normdate = normaliseddate(date,depth);
						
						fromts = normdate.getTime()/1000;
						
						if (dataforbin(normdate, position.y, summary)){
							parameters[depth+1] = {host: "10.8.0.2", bin:Math.pow(60,2-depth),fromts:fromts, tots:fromts + torange[depth]};
							if (depth < 2){
								ajaxservice.ajaxGetJson('summary',parameters[depth+1], curry(renderroot, depth+1));
							}
							else{
								ajaxservice.ajaxGetJson('browsing' ,{host: "10.8.0.2", fromts: fromts, tots: fromts+torange[depth]}, curry(createzoomchart,fromts, depth+1));
							}	
						}
						else{
							if (depth >= 1)
								ajaxservice.ajaxGetJson('summary', parameters[depth-1], curry(renderroot, depth-1));	
						}
					}
				}
			);
		},
		
		normaliseddate = function(date, depth){
			if (depth == 0){
				return new Date(date.getFullYear() + "/" + (date.getMonth()+1) + "/" + date.getDate());
			}
			else if (depth == 1){
				return new Date(date.getFullYear() + "/" + (date.getMonth()+1) + "/" + date.getDate() + " " + date.getHours() + ":00");
			}
			else if (depth == 2){
				return new Date(date.getFullYear() + "/" + (date.getMonth()+1) + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":00");
			}
		},
		
		dataforbin = function(adate, ypos, data){
			for (i = 0 ; i < data.length; i++){
				d = new Date(data[i][0]);		
				if (d.getTime() == adate.getTime()){
					if (ypos < data[i][1])
						return true;
				}
			}
			return false;
		},
		
		curry = function(fn){
			var args = Array.prototype.slice.call(arguments, 1);
			return function(){
				return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, 0)));
			};
		},
	
		
		init = function(){
			parameters[0] = {host: "10.8.0.2", bin:60*60*24};
			ajaxservice.ajaxGetJson('summary',parameters[0], curry(renderroot, 0));
		}
		
		return{
			init: init,
		}
});