window.plot_bar = function() {

    function search(searchterm){
	var hits = 0;
	message(hits);
	return function(item){
	    var pass = item.x.lastIndexOf(searchterm, 0) === 0;
	    message(hits += pass? 1 : 0);
	    return pass;
	}
    }

    function message(nhits){
	var el = document.getElementById("bar_searchresults")
	, basemsg = "Found "+nhits+" result"
	, msg = (nhits == 1)? basemsg+"." : basemsg+"s.";

	if (el.childNodes.length > 0)
	    for (i=0; i<=el.childNodes.length; i+=1)
		el.childNodes[i].remove();
	el.appendChild(document.createTextNode(msg));
    }

    function init(args_obj){ 
	var margin = {top: 20, right: 20, bottom: 30, left: 40 }
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

    function gt(val, argidx){
	argidx = ! (argidx)? 0: argidx;
	return function (){
	    return arguments[argidx] > val;
	}
    }

    function decompose(filter_func){
	function decomposer(obj) {
	    var x_bins = keys(obj).filter( gt(0,1) );
	    return x_bins.map(function(bin){ 
		return {     x: bin,
			     y: +obj[bin],
			     Taxon: obj.Taxon }; 
	    }).filter(filter_func);
	};
	return decomposer;
    }

    function sort(arr, attr){
	return arr.sort( function(a, b){ 
	    var a = +a[attr].replace(/.*\.(\d+)$/, '$1')
	    , b = +b[attr].replace(/.*\.(\d+)$/, '$1')
	    return a > b? 1 : -1;
	});
    }

    function perc(num, decs){ 
	decs = decs === undefined? 0 : decs
	return (num*100).toFixed(decs) + " %";
    }

    d3.tsv("bar.txt", identity, function(err, data){
	var searchterm = window.hmp2_cookie().get()
	, parsed = data.map( decompose(search(searchterm)) )
	, parsed = parsed.map( function(r){ return sort(r, "x"); } )
	, dims = init({nsubj: parsed[0].length})
	, stack = d3.layout.stack().order('inside-out')
	, layers = stack(parsed);

	dims.x.domain(layers[0].map(function(row){ return row.x; }));

	var taxon = dims.svg.selectAll("g.taxon").
	    data(layers).
	    enter().append("svg:g").
	    attr("class", "taxon").
	    style("fill", function(d, i){ return dims.z(i); }).
	    style("stroke", function(d, i){ 
		return d3.rgb(dims.z(i)).darker(); 
	    });

	var rects = taxon.selectAll("rect").
	    data(Object).
	    enter().append("svg:rect").
	    attr("x", function(d){ return dims.x(d.x); }).
	    attr("y", function(d){ return dims.y(d.y0); }).
	    attr("height", function(d){ return dims.y(d.y); }).
	    attr("width", dims.x.rangeBand());

	rects.append("svg:title").
	    text(function(row){ return row.Taxon + ": " + perc(row.y, 2); });

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
    });

};

