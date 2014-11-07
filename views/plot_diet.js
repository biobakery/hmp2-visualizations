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


    window.update_diet = function(el){
	var diet = el.value
	, sample = document.getElementById("avg_chart_selector").value
	, i = +window.diet_data[0][sample][diet]
	, ref = window.diet_rects[0][i]
	, new_y = y(window.diet_data[1][diet].state[i]);

	window.diet_rects.
	    data(d3.range(5).map(function(i){ 
		var cnt = window.diet_data[1][diet].state[i];
		return cnt? cnt : 0
	    })).
	      transition().duration(750).
	    delay(function(_, i){ return i*50; }).
	    attr("y", function(row){ return y(row); }).
	    attr("height", function(row){ return height-y(row); });

	d3.select("#diet_response_ind").
	      transition().duration(750).
	    attr("x", ref.x.baseVal.valueAsString).
	    attr("y", new_y-15);
    };

    var resp_map = ["None", "Last 4 - 7 days", "Last 2 - 3 days", 
		    "Yesterday, 1 - 2 times", "Yesterday, 3 - 4 times"];

    var margin = {top: 20, right: 20, bottom: 100, left: 40 }
    , width =  450 - margin.left - margin.right
    , height = 450 - margin.top - margin.bottom;
    
    var x = d3.scale.ordinal().
	rangeRoundBands([0, width - margin.left - margin.right], 0.1).
	domain(resp_map);

    var y = d3.scale.linear().
	range([height, 0]);
    
    var color = function(sample, diet){ 
	return function(_, i){
	    var resp = +window.diet_data[0][sample][diet];
	    return i === resp? "#0a0" : "#000"; 
	}
    };

    var xAxis = d3.svg.axis().
	scale(x).
	orient("bottom");
    
    var yAxis = d3.svg.axis().
	scale(y).
	orient("left");

    var dropdown = d3.select("#diet_chart_area").append("select").
	attr("id", "diet_chart_selector").
	attr("onchange", "window.update_diet(this)");

    var svg = d3.select("#diet_chart_area").append("svg").
	attr("width", width + margin.left + margin.right).
	attr("height", height + margin.top + margin.bottom).
	  append("svg:g").
	attr("transform", "translate("+margin.left+","+margin.top+")");


    d3.tsv("diet.txt", identity, function(err, data){
	var categories = keys(data[0]).filter(not("#SampleID"))
	, firstdiet = categories[0]
	, firstsample = data[data.length-1]["#SampleID"]
	, attrcounter = new Object
	, responses = new Object;

	categories.map(function(cat){ 
	    attrcounter[cat] = Counter();
	});

	data.map(function(row){ 
	    row.x = row["#SampleID"];
	    delete row["#SampleID"];
	    responses[row.x] = row;
	    keys(row).map(function(key){
		if (key != "x")
		    attrcounter[key].count(row[key]);
	    });
	});

	window.diet_data = [responses, attrcounter];

	var maxes = values(attrcounter).map(function(c){ 
	    return d3.max(values(c.state)); 
	});
	y.domain([0, d3.max( maxes )]);

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

	window.diet_rects = svg.selectAll("rect.diet").
	    data(d3.range(5).map(function(i){ 
		var cnt = attrcounter[firstdiet].state[i]; 
		return cnt? cnt : 0
	    })).
	      enter().append("rect").
	    attr("class", "diet").
	    attr("width", x.rangeBand()).
	    attr("x", function(_, i){ return x(resp_map[i]); }).
	    attr("y", function(row){ return y(row); }).
	    attr("height", function(row){ return height-y(row); }).
	    style("stroke", "#000");

	var i = +responses[firstsample][firstdiet]
	, ref = window.diet_rects[0][i];

	d3.select(window.diet_rects[0].parentNode).
	    append("text").
	    attr("id", "diet_response_ind").
	    attr("x", ref.x.baseVal.valueAsString).
	    attr("y", ref.y.baseVal.value-15).
	    attr("font-size", "30").
	    text("You");

    });
}