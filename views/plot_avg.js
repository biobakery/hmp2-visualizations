window.plot_avg = function(){

    const min_abd = 0.001

    var margin = {top: 40, right: 30, bottom: 100, left: 40 }
    , width =  450 - margin.left - margin.right
    , height = 450 - margin.top - margin.bottom;

    var x0 = d3.scale.ordinal().
	rangeRoundBands([0, (width - margin.left - margin.right)], 0.1);

    var x1 = d3.scale.ordinal();

    var y = d3.scale.linear().
	range([height, 0]);
    
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

    function phylum(str){ 
	return str.replace(/.*p__(\S+)/, "$1");
    }

    function by_last_number(a, b){
	// For use with sort function
	var a = +a.replace(/.*\.(\d+)$/, '$1')
	, b = +b.replace(/.*\.(\d+)$/, '$1')
	return a > b? 1 : -1;
    }

    function is_numeric(item){
	return !isNaN(parseFloat(item)) && isFinite(item);
    }

    function grep(regex){
	return function(str){
	    return str.match(regex)? true : false;
	};
    }

    function flatten(mtx){
	return Array.prototype.concat.apply([], mtx);
    }

    function decompose(obj){
	return keys(obj).map(function(key, i){
	    return {x: i,
		    y: +obj[key],
		    Taxon: key};
	});
    }
    
    function add_missing(objarr, compare){
	if (compare === undefined)
	    compare = objarr;
	var ever_seen = new Object;
	compare.map(function(d){ ever_seen[d.Taxon] = true; });
	objarr.map(function(obj){
	    keys(ever_seen).map(function(taxon){
		if (obj[taxon] === undefined)
		    obj[taxon] = 0;
	    });
	});
	return objarr
    }

    function to_samplename(base){ 
	return function mapper(_, i) {
	    return base+"."+i.toString()
	};
    }

    var pid = window.hmp2_cookie().get()
    , samplenames = window.user_data.taxa.instances.map(to_samplename(pid))
    , global_avg_data = decompose(window.average_data.taxa)
    , user_avg_data = [window.user_data.taxa.averages]
    , user_avg_data = add_missing(user_avg_data, global_avg_data)
    , user_avg_data = decompose(user_avg_data[0])
    , l = window.user_data.taxa.instances.length
    , newest_sample = window.user_data.taxa.instances[l-1]
    , data = add_missing(window.user_data.taxa.instances, global_avg_data)
    , data = data.map(decompose)
    , latest = data.length-1
    , allpoints = flatten(data).concat(user_avg_data).concat(global_avg_data);
    
    function maybe(float_){ return float_ === undefined? 0: float_; }
    function abd_filter(newest, key){
	var key = key === undefined? identity : key;
	return function(phylum_obj){
	    return (   maybe(newest[key(phylum_obj)])           > min_abd
		    || maybe(user_avg_data[key(phylum_obj)])    > min_abd
		    || maybe(global_avg_data[key(phylum_obj)])  > min_abd);
	};
    }

    y.domain([ 0, d3.max(allpoints, function(obj){ return obj.y; }) ]);

    dropdown.selectAll("option").
	data(samplenames).
	  enter().append("option").
	attr("value", identity).
	attr("selected", function(_, i){ return i == latest; }).
	text(identity);


    var xAxis_g = svg.append("g").
	attr("class", "x axis").
	attr("transform","translate(0,"+height+")");

    svg.append("g").
	attr("class", "y axis").
	call(yAxis);

    var taxon = svg.selectAll(".taxon");

    window.update_bar = function(el, update_diet) {
	var sample_id = el.value
	, i = parseFloat(sample_id.replace(/.*\.(\d+)$/, '$1'))
	, sample = window.user_data.taxa.instances[i]
	, sample_phyla = data[0].map(getattr("Taxon")).
	    map(phylum).
	    filter(abd_filter(sample));

	x0.domain(sample_phyla);
	x1.domain(["Study Average", "Your Average", sample_id]).
	    rangeRoundBands([0, x0.rangeBand()]);

	xAxis.scale(x0);

	xAxis_g.call(xAxis).
	  selectAll("text").
	attr("transform", "rotate(35)").
	style("text-anchor", "start");

	var color = d3.scale.category10();
    
	var legend = svg.selectAll(".avg_legend").
	    data(["Study Average", "Your Average", sample_id]).
	    enter().append("g").
	    attr("class", "avg_legend").
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


	if (taxon.data().length > 0) {
	    taxon = taxon.remove();
	    taxon = taxon.data([]);
	}

	taxon = taxon.
	    data(sample_phyla).
	    enter().append("g").
	    attr("class", "g").
	    attr("transform", function(phylum){
		return "translate("+x0(phylum)+",0)";});

	taxon.selectAll("rect").
	    data(function(taxon){ 
		return [ {k: "Study Average",
			  v: window.average_data.taxa[taxon]},
			 {k: "Your Average" ,
			  v: window.user_data.taxa.averages[taxon]}, 
			 {k: sample_id,
			  v: sample[taxon]} ];
	    }).
	      enter().append("rect").
	    attr("width", x1.rangeBand()).
	    attr("height", 0).
	    attr("x", function(row){ return x1(row.k); }).
	    attr("y", height).
	    style("fill", function(row){ return color(row.k); }).
	    style("stroke", "#000");

	taxon.selectAll("rect").
	    transition().duration(750).
	    attr("height", function(row){ return height-y(row.v); }).	    
	    attr("y", function(row){ return y(row.v); });
	    
	d3.selectAll(".avg_legend text").
	    data(["Study Average", "Your Average", sample_id]).
	    text(identity);

	if (update_diet !== false)
	    window.update_diet(
		document.getElementById("diet_chart_selector")
	    );
    }
    window.update_bar(document.getElementById("avg_chart_selector"), false);
};
