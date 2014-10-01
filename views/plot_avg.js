window.plot_avg = function(){

    var margin = {top: 20, right: 20, bottom: 70, left: 40 }
    , width =  450 - margin.left - margin.right
    , height = 450 - margin.top - margin.bottom
    , has_avg = false
    , avg_data = undefined
    , has_bar = false
    , bar_data = undefined;

    var x0 = d3.scale.ordinal().
	rangeRoundBands([0, (width - margin.left - margin.right)], 0.1);

    var x1 = d3.scale.ordinal();

    var y = d3.scale.linear().
	range([height, 0]);
    
    var color = d3.scale.category10();
    
    var xAxis = d3.svg.axis().
	scale(x0).
	orient("bottom");
    
    var yAxis = d3.svg.axis().
	scale(y).
	orient("left").
	ticks(10, "%");

    var dropdown = d3.select("#avg_chart_area").append("select").
	attr("id", "avg_chart_selector").
	attr("onchange", "window.update_bar(this)");

    var svg = d3.select("#avg_chart_area").append("svg").
	attr("width", width + margin.left + margin.right).
	attr("height", height + margin.top + margin.bottom).
	  append("svg:g").
	attr("transform", "translate("+margin.left+","+margin.top+")");
    

    window.update_bar = function(el) {
	window.avg_rects.
	    data(function(bug){ 
		return bug.abundances.filter(
		    function(row){
			return row.name == "Average" || row.name == el.value;
		    });
	    }).
	    transition().duration(750).
	    delay(function(row, idx){ return idx * 50; }).
	    attr("y", function(row){ return y(row.value); }).
	    attr("height", function(row){ return height-y(row.value); });

	d3.selectAll(".legend text").
	    data(["Average", el.value]).
	    text(identity);
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

    function getattr(v){
	return function(obj){
	    return obj[v];
	}
    }

    function getattrs(attrs){
	return function(obj){
	    return attrs.map( function(attr){ 
		return obj[attr];
	    });
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

    function search(searchterm){
	return function(item){
	    return item.x.lastIndexOf(searchterm, 0) === 0;
	}
    }

    function perc(num, decs){ 
	decs = decs === undefined? 0 : decs
	return (num*100).toFixed(decs) + " %";
    }

    function limiter(keywords, data){ 
	if (keywords.has_avg){
	    has_avg = true;
	    avg_data = data;
	}
	if (keywords.has_bar){
	    has_bar = true;
	    bar_data = data;
	}
	if (has_bar && has_avg){ 
	    plot(avg_data, bar_data);
	}
    }

    function phylum(str){ 
	return str.replace(/.*;p__(\S+)/, "$1");
    }

    function merge(averages, samples) {
	var merged = new Object
	, samplekeys = samples[0].map( getattr("x") );

	averages.map(function(row){ 
	    merged[ phylum(row.Taxon) ] = {
		data: [{ name: "Average",
			 value: +row.Average }]
	    };
	});
	samples.map(function(sample){
	    return sample.map(function(bug){
		merged[ phylum(bug.Taxon) ].data.push(
		    { name: bug.x,
		      value: +bug.y}
		);
	    });
	});
	return keys(merged).map(function(key){ 
	    return { x: key,
		     abundances: merged[key].data };
	});
    }

    function plot(avg_data, bar_data){
	var data = merge(avg_data, bar_data)
	, samplenames = bar_data[0].map( getattr("x") ).sort()
	, latest = samplenames[samplenames.length-1];

	window.data = data;

	x0.domain(data.map(getattr("x")));
	x1.domain(["Average", latest]).rangeRoundBands([0, x0.rangeBand()]);
	y.domain(
	    [0, d3.max( 
		Array.prototype.concat.apply([], bar_data).concat(avg_data),
		function(row){ return row.y; })]
	);

	svg.append("g").
	    attr("class", "x axis").
	    attr("transform","translate(0,"+height+")").
	    call(xAxis).
	      selectAll("text").
	    attr("transform", "rotate(35)").
	    style("text-anchor", "start");

	svg.append("g").
	    attr("class", "y axis").
	    call(yAxis);

	var taxon = svg.selectAll(".taxon").
	    data(data).
	      enter().append("g").
	    attr("class", "g").
	    attr("transform", function(row){ 
		return "translate("+x0(row.x)+",0)";});

	var rects = taxon.selectAll("rect").
	    data( function(bug){ 
		return bug.abundances.filter(
		    function(row){
			return row.name == "Average" || row.name == latest;
		    });
	    }).
	      enter().append("rect").
	    attr("width", x1.rangeBand()).
	    attr("x", function(row){ return x1(row.name); }).
	    attr("y", function(row){ return y(row.value); }).
	    attr("height", function(row){ return height-y(row.value); }).
	    style("fill", function(row){ return color(row.name); });

	window.avg_rects = rects;

    }


    d3.tsv("bar.txt", identity, function(err, data){
	var searchterm = window.hmp2_cookie().get()
	, parsed = data.map( decompose(search(searchterm)) )
	, samplenames = parsed[0].map( getattr("x") ).sort()
	, latest = samplenames[samplenames.length-1];

	dropdown.selectAll("option").
	    data(samplenames).
	      enter().append("option").
	    attr("value", identity).
	    attr("selected", function(row){ return row == latest; }).
	    text(identity);
	    
	var legend = svg.selectAll(".legend").
	    data(["Average", latest]).
	    enter().append("g").
	    attr("class", "legend").
	    attr("transform", function(row, idx){ 
		return "translate(0,"+(idx*20)+")"; 
	    });

	legend.append("rect").
	    attr("x", width-margin.left-18).
	    attr("width", 18).
	    attr("height", 18).
	    style("fill", color);

	legend.append("text").
	    attr("x", width-margin.left-24).
	    attr("y", 9).
	    attr("dy", ".35em").
	    style("text-anchor", "end").
	    text(identity);

	window.avg_legend = legend;

	limiter({has_bar: true}, parsed);
    });

    d3.tsv("avg.txt", identity, function(err, data){
	limiter({has_avg: true}, data);
    });

};