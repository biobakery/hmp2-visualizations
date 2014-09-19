window.ids = new Array;

window.search = function(el){
    backtoblack();
    if (!el.value){return;}
    var searchterm = el.value
    , hits = window.ids.filter(function(id){ 
	return id.lastIndexOf(searchterm, 0) === 0; });

    message(hits.length);

    if (hits.length <= 0){return;}
    hit_groups = hits.map(function (h){ return document.getElementById(h); });
    console.log([searchterm, hits, hit_groups]);
    d3.selectAll(hit_groups).
	style("text-decoration", "underline").
	style("stroke", "black");
}

function backtoblack(){
    d3.selectAll(".taxon").
	style("text-decoration", "none").
	style("stroke", "none");
}

function message(nhits){
    var el = document.getElementById("searchresults")
    , basemsg = "Found "+nhits+" result"
    , msg = (nhits == 1)? basemsg+"." : basemsg+"s.";

    if (el.childNodes.length > 0)
	for (i=0; i<=el.childNodes.length; i+=1)
	    el.childNodes[i].remove();
    el.appendChild(document.createTextNode(msg));
}

window.fillsearchbox = function(){
    var el = document.getElementById('sel_sample')
    , sample_id = window.hmp2_cookie().get();
    el.value = sample_id;
    el.onkeyup();
}


function init(args_obj){ 
    var margin = {top: 20, right: 20, bottom: 30, left: 40 }
    , width = (args_obj.nsubj * 105) - margin.left - margin.right
    , height = 500 - margin.top - margin.bottom;

    var x = d3.scale.ordinal().
	rangeRoundBands([0, (width - margin.left - margin.right)], 0.1);
    
    var y = d3.scale.linear().
	domain([0, 1]).
	range([0, height]);

    var z = d3.scale.category10();

    var svg = d3.select("#plot_area").append("svg").
	attr("width", width + margin.left + margin.right).
	attr("height", height + margin.top + margin.bottom).
	append("svg:g").
	attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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

function decompose(obj){
    var x_bins = keys(obj).filter( gt(0,1) );
    return x_bins.map(function(bin){ 
	return {     x: bin, 
		     y: +obj[bin],
		 Taxon: obj.Taxon }; 
    });
}

function perc(num, decs){ 
    decs = decs === undefined? 0 : decs
    return (num*100).toFixed(decs) + " %";
}

// This transpose works fine, but I don't want to transpose like this
// 
// function transpose(array_of_objects, join_on){ 
//     var new_rows = keys(array_of_objects[0]).filter( gt(0, 1) );
//     return new_rows.map(function(field_key){
// 	new_obj = new Object;
// 	new_obj["id"] = field_key;
// 	array_of_objects.map(function(row){ 
// 	    new_obj[ row[join_on] ] = row[field_key];
// 	});
// 	return new_obj;
//     });
// }

d3.tsv("bar.txt", identity, function(err, data){
    var parsed = data.map(decompose)
    , dims = init({nsubj: parsed[0].length})
    , stack = d3.layout.stack().order('inside-out')
    , layers = stack(parsed);

    window.ids = layers[0].map(function(row){ return row.x; });

    dims.x.domain(layers[0].map(function(row){ return row.x; }));

    var taxon = dims.svg.selectAll("g.taxon").
	data(layers).
	  enter().append("svg:g").
	attr("class", "taxon").
	style("fill", function(d, i){ return dims.z(i); }).
	style("stroke", function(d, i){ return d3.rgb(dims.z(i)).darker(); });

    var rects = taxon.selectAll("rect").
	data(Object).
	  enter().append("svg:rect").
	attr("x", function(d){ return dims.x(d.x); }).
	attr("y", function(d){ return dims.y(d.y0); }).
	attr("height", function(d){ return dims.y(d.y); }).
	attr("width", dims.x.rangeBand());

    rects.append("svg:title").
	text(function(row){ return row.Taxon + ": " + perc(row.y, 2); });

    var label = dims.svg.selectAll("text").
	data(dims.x.domain()).
	  enter().append("svg:text").
	attr("x", function(d){ return dims.x(d) + dims.x.rangeBand()/2 }).
	attr("y", dims.height + 10).
	attr("text-anchor", "middle").
	attr("dy", ".71em").
	attr("id", identity).
	text(identity);

    var rule = dims.svg.selectAll("g.rule").
	data(dims.y.ticks(10)).
	  enter().append("svg:g").
	attr("class", "rule").
	attr("transform", function(d){ return "translate(0,"+dims.y(d)+")"; }).
	text(identity);

    rule.append("svg:line").
	attr("x2", dims.width - dims.margin.left - dims.margin.right - 6).
	style("stroke", "#000").
	style("stroke-opacity", 0.2);

    rule.append("svg:text").
	attr("x", dims.width - dims.margin.right - dims.margin.left).
	attr("dy", ".35em").
	text(function(num){ return perc(1-num); });

    document.getElementById("sel_sample").onkeyup();
});

