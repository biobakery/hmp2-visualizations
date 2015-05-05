window.plot_bar = function() {

    function init(args_obj){ 
	var margin = {top: 40, right: 20, bottom: 30, left: 40 }
	, width = 960 - margin.left - margin.right
	, height = 500 - margin.top - margin.bottom;

	var x = d3.scale.ordinal().
	    rangeRoundBands([0, (width - margin.left - margin.right)], 0.1);
	
	var y = d3.scale.linear().
	    domain([0, 1]).
	    range([0, height]);

	var z = d3.scale.category10();

	var svg = d3.select("#bar_chart_area").append("svg").
	    attr("width", width + margin.left + margin.right).
	    attr("height", height + margin.top + margin.bottom).
	    append("svg:g").
	    attr("transform", 
		 "translate(" + margin.left + "," + margin.top + ")");

	return { margin : margin,
		 width  : width,
		 height : height,
		 x      : x,
		 y      : y,
		 z      : z,
		 svg    : svg     }
    }

    function identity(data) {
	return data;
    }

    function keys(obj){
	var thekeys = new Array;
	for (prop in obj){ 
	    if (obj.hasOwnProperty(prop))
		thekeys.push(prop);
	}
	return thekeys;
    }

    function decompose(filter_func){
	function decomposer(obj) {
	    var x_bins = keys(obj).filter( gt(0,1) );
	    return keys(obj).map(function(bin, i){ 
		return { x: i,
			 y: +obj[bin],
			 Taxon: bin }; 
	    }).filter(filter_func);
	};
	return decomposer;
    }

    function add_missing(objarr){
	var ever_seen = new Object;
	objarr.map(function(obj){ keys(obj).map(function(taxon){
	    ever_seen[taxon] = true;
	})});
	objarr.map(function(obj, i){
	    keys(ever_seen).map(function(taxon){
		if (obj[taxon] === undefined)
		    obj[taxon] = 0;
	    });
	});
	return objarr;
    }

    function gt(val, argidx){
	argidx = ! (argidx)? 0: argidx;
	return function (){
	    return arguments[argidx] > val;
	}
    }

    function sort(arr, attr){
	return arr.sort( function(a, b){ 
	    var a = a[attr], b = b[attr];
	    return a > b? 1 : -1;
	});
    }

    function perc(num, decs){ 
	decs = decs === undefined? 0 : decs;
	return (num*100).toFixed(decs) + " %";
    }

    var pid = window.hmp2_cookie().get()
    , data = add_missing(window.user_data.taxa.instances)
    , parsed = data.map( decompose(identity) )
    , parsed = parsed.map(function(arr){ return sort(arr,'Taxon');})
    , parsed = d3.transpose(parsed)
    , dims = init({nsubj: data.length})
    , stack = d3.layout.stack().order('inside-out')
    , layers = stack(parsed);

    dims.x.domain(data.map(function(_, i){ return pid+"."+i.toString(); }));

    var taxon = dims.svg.selectAll("g.taxon").
	data(layers).
	enter().append("svg:g").
	attr("class", "taxon").
	style("fill", function(d, i){ return dims.z(i); }).
	style("stroke", function(d, i){ 
	    return d3.rgb(dims.z(i)).darker(); 
	});

    dims.svg.selectAll("text").
	data(dims.x.domain()).
	  enter().append("svg:text").
	attr("x", 0).
	attr("y", 0).
	attr("transform", function(d){
	    return "translate("+(dims.x(d)+5)+",-5) rotate(-20)";
	}).
	text(identity);

    var rects = taxon.selectAll("rect").
	data(Object).
	  enter().append("svg:rect").
	attr("x", function(d, i){ return dims.x(pid+"."+i.toString()); }).
	attr("y", function(d){ return dims.y(d.y0); }).
	attr("height", function(d){ return dims.y(d.y); }).
	attr("width", dims.x.rangeBand()).
	on("mouseover", function(d){ 
	    return window.tooltip.
		style("visibility", "visible").
		text(d.Taxon + ": " + perc(d.y, 2));
	}).
	on("mousemove", function(){ 
	    return window.tooltip.
		style("top", (d3.event.pageY-10)+"px").
		style("left", (d3.event.pageX+10)+"px");
	}).
	on("mouseout", function(){ 
	    return window.tooltip.style("visibility", "hidden"); 
	});

    var rule = dims.svg.selectAll("g.rule").
	data(dims.y.ticks(10)).
	enter().append("svg:g").
	attr("class", "rule").
	attr("transform", function(d){ 
	    return "translate(0,"+dims.y(d)+")"; }).
	text(identity);

    rule.append("svg:line").
	attr("x2", dims.width - dims.margin.left - dims.margin.right - 6).
	style("stroke", "#000").
	style("stroke-opacity", 0.2);

    rule.append("svg:text").
	attr("x", -30).
	attr("dy", ".35em").
	text(function(num){ return perc(1-num); });

};

