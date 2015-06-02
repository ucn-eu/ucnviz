define(['module','ajaxservice','d3', 'knockout', 'knockoutpb'], function(module,ajaxservice,d3, ko){
	var

	 	m = [20, 120, 20, 120],
    w = 1200 - m[1] - m[3],
    h = 550 - m[0] - m[2],
    i = 0,
    root,
		totalsize = 0,
		_selected = "",
		extra = {},
		tree = d3.layout.tree().size([h, w]),

		parentfor = {},
		nodefor = {},

		diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; }),

 	  vis = d3.select("#tree").append("svg:svg")
    												.attr("width", w + m[1] + m[3])
    												.attr("height", h + m[0] + m[2])
  													.append("svg:g")
    											  .attr("transform", "translate(" + m[3] + "," + m[0] + ")"),

		nodechanged = ko.observable().publishOn("node_changed"),

		init = function(){
				host = module.config().host;

				ajaxservice.ajaxGetJson('classify/host', {host:host}, function(data){
					var tree = buildtree(data.classification);
					root = {name:"browsing", size:totalsize, children:tree}
					root.x0 = h / 2;
  				root.y0 = 0;

				  function toggleAll(d) {
				    if (d.children) {
				      d.children.forEach(toggleAll);
				      toggle(d);
				    }
				  }

				  // Initialize the display to show a few nodes.
				  root.children.forEach(toggleAll);
				  //toggle(root.children[1]);
				 // toggle(root.children[1].children[2]);
				 // toggle(root.children[9]);
				 // toggle(root.children[9].children[0]);

					render(root);
				});
		},

		createnewparent = function(parentkey, key, ts, tld){
			//will have already added tlds,size to this node
			ts = ts.split(",");
			tld = tld.split(",");

			var parent = nodefor[parentkey];
			parent.children = parent.children || {};
			parent.children[key] = {name:key, size: ts.length, ts:ts, urls:tld}
			parentfor[key] = parent;
			nodefor[key] 	 = parent.children[key];
		},

		createroot = function(tree, key, ts, tld){

			ts = ts.split(",");
			tree[key] = {name:key, size: ts.length, ts:ts, urls:tld.split(",")}
			nodefor[key] = tree[key];
		},

		getparentfor = function(key){
			return parentfor[key];
		},

		buildtree = function(data){

				var tree = {};
				totalsize = 0;
				data.forEach(function(node,i){
						var size = node.ts.split(",").length;
						var ts = node.ts.split(",");
						var tld = node.tld.split(",");

						totalsize += size;

						//var parent = node;
						var lastkey;
						//can either be a sub of
						node.classification.forEach(function(key, i){

								//var parent = parentfor[key] //if this node already has a parent

								//if node has been seen before
								var n = nodefor[key];

								if (n) { //if this node has been seen before.
										n.size += size;
										n.urls.concat(tld);
										n.ts.concat(ts);
								}
								else if (lastkey){ //add as child to previous node if one exists
										createnewparent(lastkey, key, node.ts, node.tld);
								}
								else{ //this is a brand new node
										createroot(tree, key, node.ts, node.tld)
								}
								lastkey = key;
						});
				});

			//	Object.keys(extra).forEach(function(key){
				//		extra[key] = {ts: extra[key].ts.split(","), urls: extra[key].urls.split(",")};
				//});

				//now need to turn all children objects into arrays for format required by d3
				console.log(tree);

				var arraytree = convertchildrentoarrays(tree);


				return Object.keys(arraytree).map(function(key){
					return arraytree[key];
				});
		},


		convertchildrentoarrays = function(tree){
				return Object.keys(tree).map(function(key){
					 	//base case - if no chilren, don't do anything.
						var node = tree[key];

						if (!node.children){

								return{
									name:node.name,
									ts: node.ts,
									urls: node.urls,
									size: node.size,
							}
						}

						return {
							name:node.name,
							ts: node.ts,
							urls: node.urls,
							size: node.size,
							children:  convertchildrentoarrays(node.children)
						}

				});
		},


		getextrafor = function(node){
			//var details = extra[node.name]
			var details = {ts: node.ts, urls: node.urls, name: node.name};
			details.percentage = ((node.size/totalsize)*100).toFixed(2);
			nodechanged(details);
		},

		nodeselected = function(node){

			return _selected.name == node.name;
		},

		selectnode = function(node){
			_selected = node;
		}

		render = function(source) {

		  var duration = d3.event && d3.event.altKey ? 5000 : 500;
		  // Compute the new tree layout.
		  var nodes = tree.nodes(root).reverse();

		  // Normalize for fixed-depth.
		  nodes.forEach(function(d) { d.y = d.depth * 180; });

		  // Update the nodes…
		  var node = vis.selectAll("g.node")
		      .data(nodes, function(d) { return d.id || (d.id = ++i); });

		  // Enter any new nodes at the parent's previous position.
		  var nodeEnter = node.enter().append("svg:g")
		      .attr("class", "node")
		      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
		      .on("click", function(d) { toggle(d);selectnode(d); render(d);  getextrafor(d);});

		  nodeEnter.append("svg:circle")
		      .attr("r", 1e-6)
		      .style("fill", function(d) { return nodeselected(d) ? "#ff0000" : d._children ? "lightsteelblue" : "#fff"; });

		  nodeEnter.append("svg:text")
		      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
		      .attr("dy", ".35em")
		      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
		      .text(function(d) { return d.name + " ("  + ((d.size/totalsize)*100).toFixed(2) + ")"; })
		      .style("fill-opacity", 1e-6);

		  // Transition nodes to their new position.
		  var nodeUpdate = node.transition()
		      .duration(duration)
		      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

		  nodeUpdate.select("circle")
		      .attr("r", function(d) { return Math.max(3,(d.size/totalsize) * 20)})
		      .style("fill", function(d) { return nodeselected(d) ? "#ff0000" : d._children ? "lightsteelblue" : "#fff"; });

		  nodeUpdate.select("text")
		      .style("fill-opacity", 1);

		  // Transition exiting nodes to the parent's new position.
		  var nodeExit = node.exit().transition()
		      .duration(duration)
		      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
		      .remove();

		  nodeExit.select("circle")
		      .attr("r", 1e-6);

		  nodeExit.select("text")
		      .style("fill-opacity", 1e-6);

		  // Update the links…
		  var link = vis.selectAll("path.link")
		      .data(tree.links(nodes), function(d) { return d.target.id; });

		  // Enter any new links at the parent's previous position.
		  link.enter().insert("svg:path", "g")
		      .attr("class", "link")
		      .attr("d", function(d) {
		        var o = {x: source.x0, y: source.y0};
		        return diagonal({source: o, target: o});
		      })
		    .transition()
		      .duration(duration)
		      .attr("d", diagonal);

		  // Transition links to their new position.
		  link.transition()
		      .duration(duration)
		      .attr("d", diagonal);

		  // Transition exiting nodes to the parent's new position.
		  link.exit().transition()
		      .duration(duration)
		      .attr("d", function(d) {
		        var o = {x: source.x, y: source.y};
		        return diagonal({source: o, target: o});
		      })
		      .remove();

		  // Stash the old positions for transition.
		  nodes.forEach(function(d) {
		    d.x0 = d.x;
		    d.y0 = d.y;
		  });

	},//end of render

	// Toggle children.
	toggle = function(d) {
	  if (d.children) {
	    d._children = d.children;
	    d.children = null;
	  } else {
	    d.children = d._children;
	    d._children = null;
	  }
	}

	return{
		init: init
	}

});
