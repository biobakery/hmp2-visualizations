window.plot_diet = function(){

    var Counter = function(mappable) {
	var counter = new Object;
	counter.state = {};
	
	counter.count = function(val){
	    var cur_count = counter.state[val],
	    is_there = cur_count === undefined;
	    counter.state[val] = is_there? 1 : cur_count+1
	    return val;
	};

	counter.count_many = function(mappable){
	    mappable.map(function(row){ counter.count(row); });
	    return mappable;
	}

	if (mappable !== undefined){
	    counter.count_many(mappable);
	}

	return counter;
    };

    function keys(obj){
	var thekeys = new Array;
	for (prop in obj){ 
	    if (obj.hasOwnProperty(prop))
		thekeys.push(prop);
	}
	return thekeys;
    }

    function values(obj){
	var thevalues = new Array;
	for (prop in obj){ 
	    if (obj.hasOwnProperty(prop))
		thevalues.push(obj[prop]);
	}
	return thevalues;
    }

    function getattr(v){
	return function(obj){
	    return obj[v];
	}
    }

    function identity(anything){
	return anything;
    }

    function not(notthis){
	return function(data){
	    return data !== notthis;
	};
    }

    function sort(arr, attr){
	return arr.sort( function(a,b){
	    return a[attr] > b[attr]? 1: -1;
	})
    }



    var resp_map = ["None", "Last 4 - 7 days", "Last 2 - 3 days", 
		    "Yesterday, 1 - 2 times", "Yesterday, 3 - 4 times"];

    var histgroup_colors = [ "rgb(0, 170, 0)", "rgb(0, 0, 0)" ];

    var margin = {top: 20, right: 20, bottom: 100, left: 50 }
    , width =  450 - margin.left - margin.right
    , height = 450 - margin.top - margin.bottom;
    
    var x = d3.scale.ordinal().
	rangeRoundBands([0, width - margin.left - margin.right], 0.1).
	domain(resp_map);

    var x1 = d3.scale.ordinal().
	domain([0,1]).
	rangeRoundBands([0, x.rangeBand()]);

    var y = d3.scale.linear().
	range([height, 0]).
	domain([0, 1]);
    
    var color = function(_, i){ 
	return histgroup_colors[i]; 
    };

    var xAxis = d3.svg.axis().
	scale(x).
	orient("bottom");
    
    var yAxis = d3.svg.axis().
	scale(y).
	orient("left").
	ticks(10, "%");

    var dropdown = d3.select("#diet_chart_area").append("select").
	attr("id", "diet_chart_selector").
	attr("onchange", "window.update_diet(this)");

    var svg = d3.select("#diet_chart_area").append("svg").
	attr("width", width + margin.left + margin.right).
	attr("height", height + margin.top + margin.bottom).
	  append("svg:g").
	attr("transform", "translate("+margin.left+","+margin.top+")");

    window.update_diet = function(el){
	var diet = el.value
	, sample = document.getElementById("avg_chart_selector").value;

	window.hist_groups.
	    data(d3.range(5).map(function(i){
		return window.diet_data[1].map(function(cntr){
		    var cnt = cntr[diet].state[i];
		    return { x: resp_map[i]
			     , y: cnt? cnt : 0 };
		})
	    }));

	window.diet_rects.
	    data(identity).
	      transition().duration(750).
	    delay(function(_, i){ return i*50; }).
	    attr("y", function(row){ return y(row.y); }).
	    attr("height", function(row){ return height-y(row.y); });

	var i = +window.diet_data[0][sample][diet]
	, highest = d3.max(window.diet_data[1].map(function (cntr){
	    return cntr[diet].state[i]; }));

	d3.select("#diet_response_ind").
	      transition().duration(750).
	    attr("x", x(resp_map[i])-10).
	    attr("y", y(highest)-15);
    };

    d3.tsv("diet.txt", identity, function(err, data){
	var samplekey = window.hmp2_cookie().get().replace(/\..*$/, "")
	, categories = keys(data[0]).filter(not("#SampleID"))
	, firstdiet = categories[0]
	, firstsample = data[data.length-1]["#SampleID"]
	, sample_attrcounter = new Object
	, study_attrcounter = new Object
	, responses = new Object;

	categories.map(function(cat){ 
	    sample_attrcounter[cat] = Counter();
	    study_attrcounter[cat] = Counter();
	});

	data.map(function(row){ 
	    row.x = row["#SampleID"];
	    delete row["#SampleID"];
	    responses[row.x] = row;
	    keys(row).map(function(key){
		if (key != "x"){
		    study_attrcounter[key].count(row[key]);
		    if (row.x.indexOf(samplekey) >= 0) 
			sample_attrcounter[key].count(row[key]);
		}
	    });
	});

	window.diet_data = [responses, 
			    [sample_attrcounter, study_attrcounter] ];

	// normalize counts to ratios
	diet_data[1].map(function(cntr){ 
	    keys(cntr).map(function(key){
		var normalizer = d3.sum(values(cntr[key].state));
		keys(cntr[key].state).map(function(resp){
		    cntr[key].state[resp] /= normalizer
		})
	    })
	});

	dropdown.selectAll("option").
	    data(categories).
	    enter().append("option").
	    attr("value", identity).
	    text(identity);

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


	window.hist_groups = svg.selectAll("g.histgroup").
	    data(d3.range(5).map(function(i){
		return window.diet_data[1].map(function(cntr){
		    var cnt = cntr[firstdiet].state[i];
		    return { x: resp_map[i]
			     , y: cnt? cnt : 0 };
		})
	    })).
	    enter().append("svg:g").
	    attr("class", "histgroup").
	    attr("transform", function(row){ 
		return "translate("+x(row[0].x)+",0)"; });


	window.diet_rects = hist_groups.selectAll("rect.diet").
	    data(identity).
	      enter().append("rect").
	    attr("class", "diet").
	    attr("width", x1.rangeBand()).
	    attr("x", function(_,i){ return x1(i); }).
	    attr("y", function(d){ return y(d.y); }).
	    attr("height", function(row){ return height-y(row.y); }).
	    style("fill", function(_, i){ return histgroup_colors[i]; }).
	    style("stroke", "#000");

	var i = +responses[firstsample][firstdiet]
	, leftmost = window.diet_rects[i][0]
	, highest = sort(window.diet_rects[i], "height.baseVal.value")[0]
	, xval = leftmost.parentNode.transform.baseVal[0].matrix.e-10
	, yval = highest.y.baseVal.value-15;

	d3.select(window.diet_rects[0][0].parentNode).
	    append("text").
	    attr("id", "diet_response_ind").
	    attr("x", xval).
	    attr("y", yval).
	    attr("font-size", "32").
	    text("You");

	var legend = svg.selectAll(".diet_legend").
	    data(["Your Average", "Study Average"]).
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


    });
}