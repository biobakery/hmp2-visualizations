window.plot_avg = function(){

    var margin = {top: 20, right: 20, bottom: 100, left: 40 }
    , width =  450 - margin.left - margin.right
    , height = 450 - margin.top - margin.bottom;

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
	var avgkey = el.value.replace(/\.\d+$/, "")+"_Average"
	, latest = el.value;
	window.avg_rects.
	    data(function(bug){ 
		return [ {k: "Study Average", v: bug.GlobalAverage},
			 {k: "Your Average" , v: bug[avgkey]}, 
			 {k: el.value,        v: bug[el.value]} ];
	    }).
	    transition().duration(750).
	    delay(function(_, i){ return i * 50; }).
	    attr("y", function(row){ return y(row.v); }).
	    attr("height", function(row){ return height-y(row.v); });

	d3.selectAll(".avg_legend text").
	    data(["Study Average", "Your Average", latest]).
	    text(identity);

	window.update_diet( document.getElementById("diet_chart_selector") );
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

    function search(searchterm){
	return function(item){
	    return item.lastIndexOf(searchterm, 0) === 0;
	}
    }

    function phylum(str){ 
	return str.replace(/.*;p__(\S+)/, "$1");
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

    function preprocess(row){
	keys(row).filter(gt(0, 1)).map(function(key){ 
	    row[key] = +row[key];
	});
	row.Taxon = phylum(row.Taxon);

	to_average = d3.entries(row).
	    filter(function(d){ return is_numeric(d.value); });
	row.GlobalAverage = d3.mean(to_average, getattr("value"));
	nested = d3.nest().
	    key(function(d){ return d.key.replace(/\.\d+$/, ""); }).
	    entries(to_average);
	nested.map(function(subjectgroup){ 
	    var k = subjectgroup.key+"_Average";
	    row[k] = d3.mean(subjectgroup.values, getattr("value"));
	});
	return row;
    }

    d3.tsv("bar.txt", preprocess, function(err, data){
	var searchterm = window.hmp2_cookie().get().replace(/\..*$/, '')
	, allkeys = keys(data[0])
	, subj_samples = allkeys.filter(search(searchterm))
	, avgkey = subj_samples.filter( grep(/_Average$/) )[0]
	, samplenames = subj_samples.filter( grep(/\.\d+$/) ).sort(by_last_number)
	, latest = samplenames[samplenames.length-1]
	, allpoints = flatten(data.map(d3.values)).filter(is_numeric);

	x0.domain(data.map(getattr("Taxon")));
	x1.domain(["Study Average", "Your Average", latest]).
	    rangeRoundBands([0, x0.rangeBand()]);
	y.domain([ 0, d3.max(allpoints) ]);

	dropdown.selectAll("option").
	    data(samplenames).
	      enter().append("option").
	    attr("value", identity).
	    attr("selected", function(row){ return row == latest; }).
	    text(identity);
	    
	var legend = svg.selectAll(".avg_legend").
	    data(["Study Average", "Your Average", latest]).
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

	window.avg_legend = legend;

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
		return "translate("+x0(row.Taxon)+",0)";});

	var rects = taxon.selectAll("rect").
	    data(function(bug){ 
		return [ {k: "Study Average", v: bug.GlobalAverage},
			 {k: "Your Average" , v: bug[avgkey]}, 
			 {k: latest,          v: bug[latest]} ];
	    }).
	      enter().append("rect").
	    attr("width", x1.rangeBand()).
	    attr("x", function(row){ return x1(row.k); }).
	    attr("y", function(row){ return y(row.v); }).
	    attr("height", function(row){ return height-y(row.v); }).
	    style("fill", function(row){ return color(row.k); });

	window.avg_rects = rects;

    });

};