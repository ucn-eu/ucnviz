define(['jquery','ajaxservice', 'knockout','moment','flotr', 'flot', 'flottime'], function($,ajaxservice,ko,moment){
	
	var
		categories = ko.observableArray(["processes", "data"]),
		
		//alphabet = ko.observableArray("abcdefghijklmnopqrstuvwxyz".split('')),
		
		fromts,
		
		tots,
		
		processes 	= ko.observableArray([]),
		
		alphabet = ko.computed(function(){
			filteredalphabet = []
			for (i = 0; i < processes().length; i++){
				startletter = processes()[i].toLowerCase()[0]
				if (filteredalphabet.indexOf(startletter) == -1){
					filteredalphabet.push(startletter);
				}
			}
			return filteredalphabet;
		}),
		
		selectedletter = ko.observable(alphabet()[0]),
			
		placeholder = $("#devicegraph"),
		
		netholder	= $("#netgraph"),
		
		title	 = ko.observable(""),	
		
		hosts	= ko.observableArray([]),
		
		filtered = ko.observable(false),
		
		selectedprocess = ko.observable(""),
		
		selectedhost = ko.observable(),
	
		selectnewprocess = function(processname){
			selectedprocess(processname);
			ajaxservice.ajaxGetJson('devices/process',{host:selectedhost(), process:processname}, processdetails);
		},
		
		selectnewhost = function(host){
	
		},
		
		stringStartsWith = function(stritem, strchar){
			return stritem[0] == strchar;
		},
		
		filteredprocesses = ko.computed(function(){
			var filter = selectedletter();
			if (!filter){
				return processes();
			}else{
				return ko.utils.arrayFilter(processes(), function(process){
					return stringStartsWith(process.toLowerCase(), filter);
				});
			}
		}),
		
		selectnewletter = function(letter){	
			selectedletter(letter);
		},
		
		togglefiltered = function(){
			filtered(!filtered());
			ajaxservice.ajaxGetJson('devices/processes',{host:selectedhost(), filtered:filtered()}, updateprocesslist);
		},
	
		amselectedletter = function(letter){
			return  selectedletter() == letter;
		},
		
		amselectedhost = function(ahost){
			return selectedhost() == ahost;
		},
			
		selectedcategory = ko.observable(categories()[0]),
		
		selectnewcategory = function(acategory){
			selectedcategory(acategory);
		},
	
		amselectedcategory = function(acategory){
			return selectedcategory() == acategory;
		},
		
		processdetails = function(data){
			
			pdetails = data.details;
			
			var d = [];
			
			mints = Number.MAX_VALUE;
			maxts = 0;
			
			for (i = 0; i < pdetails.length; i++){
				mints = Math.min(mints, pdetails[i].ts)
				maxts = Math.max(maxts, pdetails[i].ts)
				d.push([pdetails[i].ts * 1000, pdetails[i].duration]);	
			}
			
			$.plot(placeholder, [d], {
				xaxis: { mode: "time"},
				yaxis: { tickFormatter: function(n){
						
						d = maxts-mints;
						
						if (d == 0)
							 d = n;
						
						if (d > 1.5*60*60*24){
								return parseInt(n / (60*60*24)) + " days"
							}else if (d > 60*60){
								return parseInt(n / (60*60)) + " hrs"
							}else{
								return parseInt(n / (60)) + " min"
							}
						}
				},
				points: {show:true}
				
			});

		},
		
		rendernetdata	 = function(data){
			
			netdata = data.netdata;
			
			var wup =[], wdown = [], cup = [], cdown=[];
			
			for (i = 0; i < netdata.length; i++){
				wup.push([netdata[i].ts * 1000, netdata[i].wifiup]);
				wdown.push([netdata[i].ts * 1000, netdata[i].wifidown]);	
				cup.push([netdata[i].ts * 1000, netdata[i].cellup]);
				cdown.push([netdata[i].ts * 1000, netdata[i].celldown]);	
			}
			
			var data = [{ data: wup, label: "wifi up"},{ data: wdown, label: "wifi down"},{ data: cup, label: "cell up"},{ data: cdown, label: "cell down"}];
			
			
			$.plot(netholder, data, {
				xaxis: { mode: "time"},
				yaxis: { },
			});
		},
		
		updateprocesslist = function(data){
			processes(data.processes);
			fromts = data.min * 1000;
			tots = data.max * 1000;
		},
		
		init = function(hlist){
			hosts(hlist);
			selectedhost(hosts()[0]);
			ajaxservice.ajaxGetJson('devices/processes',{host:selectedhost(), filtered:filtered()}, updateprocesslist);
			ajaxservice.ajaxGetJson('devices/netdata',{host:selectedhost()}, rendernetdata);
		}
		
		
	return{
		init:init,
		title:title,
		hosts:hosts,
		amselectedhost: amselectedhost,
		selectnewhost: selectnewhost,
		
		categories:categories,
		selectedcategory:selectedcategory,
		amselectedcategory: amselectedcategory,
		selectnewcategory: selectnewcategory,
		
		processes:processes,
		selectnewprocess:selectnewprocess,
		selectedprocess:selectedprocess,
		
		alphabet: alphabet,
		selectnewletter:selectnewletter,
		amselectedletter:amselectedletter,
		filteredprocesses:filteredprocesses,
		filtered: filtered,
		togglefiltered:togglefiltered,
	}
});


