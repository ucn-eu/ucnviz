define(['module','ajaxservice','d3', 'knockout', 'knockoutpb'], function(module,ajaxservice,d3, ko){
	var

	 	m = [20, 120, 20, 120],
    w = 1280 - m[1] - m[3],
    h = 550 - m[0] - m[2],
    i = 0,
    root,
		totalsize = 0,
		extra = {},
		tree = d3.layout.tree().size([h, w]),

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

				console.log(root);
					render(root);
				});
		},

		buildtree = function(data){
				var tree = {};
				totalsize = 0;
				data.forEach(function(node,i){
						var size = node.ts.split(",").length;
						totalsize += size;

						var subtree  = node.classification.reduce(function(obj, key){
								if (obj[key]){
									obj[key].size += size;

									var combinedts = extra[key].ts + "," + node.ts;
									var combinedurls = extra[key].urls +  "," + node.tld;

									extra[key].ts = combinedts;
									extra[key].urls = combinedurls;

			
									obj[key].children = obj[key].children || {}
									return obj[key].children;
								}else{
									obj[key] = {name:key, size:size}
									extra[key] = {ts: node.ts, urls:node.tld};
								}
								return obj;
						},tree);
				});

				Object.keys(extra).forEach(function(key){
						extra[key] = {ts: extra[key].ts.split(","), urls: extra[key].urls.split(",")};
				});
				console.log("extra are");
				console.log(extra);


				//now need to turn all children objects into arrays for format required by d3
				convertchildrentoarrays(tree);

				return Object.keys(tree).map(function(key){
					return tree[key];
				});
		},

		convertchildrentoarrays = function(tree){
			  return Object.keys(tree).map(function(key){
						var subtree = tree[key];
						var item		= {name:subtree.name,size:subtree.size};
						if (subtree.children){
								subtree.children = Object.keys(subtree.children).map(function (key){
									if (subtree.children[key].children){
										return {
											name:subtree.children[key].name,
											size: subtree.children[key].size,
											children: convertchildrentoarrays(subtree.children[key].children)
										};
									}else{
										return subtree.children[key];
									}
								});
						}
						return item;
				},{});
		},

		getextrafor = function(node){
			nodechanged(extra[node.name]);
		},

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
		      .on("click", function(d) { toggle(d); render(d); getextrafor(d)});

		  nodeEnter.append("svg:circle")
		      .attr("r", 1e-6)
		      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

		  nodeEnter.append("svg:text")
		      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
		      .attr("dy", ".35em")
		      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
		      .text(function(d) { return d.name + " ("  + Math.ceil(((d.size/totalsize)*100)) + ")"; })
		      .style("fill-opacity", 1e-6);

		  // Transition nodes to their new position.
		  var nodeUpdate = node.transition()
		      .duration(duration)
		      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

		  nodeUpdate.select("circle")
		      .attr("r", 4.5)
		      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

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
