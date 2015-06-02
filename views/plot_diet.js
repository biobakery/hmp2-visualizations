window.plot_diet = function(){

    function keys(obj){
	var thekeys = new Array;
	for (prop in obj){ 
	    if (obj.hasOwnProperty(prop))
		thekeys.push(prop);
	}
	return thekeys;
    }

    function identity(anything){
	return anything;
    }

    function sort(arr, attr){
	return arr.sort( function(a,b){
	    return a[attr] > b[attr]? 1: -1;
	})
    }



    var resp_map = ["None", "Last 4 - 7 days", "Last 2 - 3 days", 
		    "Yesterday, 1 - 2 times", "Yesterday, 3 - 4 times"];

    var histgroup_colors = [ "rgb(0, 170, 0)", "rgb(0, 0, 0)" ];

    var margin = {top: 40, right: 20, bottom: 100, left: 75 }
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
	, sample = document.getElementById("avg_chart_selector").value
	, instance_id = parseFloat(sample.replace(/.*\.(\d+)$/, '$1'));

	window.hist_groups.
	    data(resp_map.map(function(resp, i){
		return [ {x: resp, y: user_avg[diet][i]},
			 {x: resp, y: global_avg[diet][i]} ]
	    }));

	window.diet_rects.
	    data(identity).
	      transition().duration(750).
	    delay(function(_, i){ return i*50; }).
	    attr("y", function(row){ return y(row.y); }).
	    attr("height", function(row){ return height-y(row.y); });

	var resp_id = window.user_data.diet.instances[instance_id][diet]
	, allratios = window.user_data.diet.averages[diet]
	, allratios = allratios.concat(window.average_data.diet[diet])
	, highest = d3.max(allratios);

	d3.select("#diet_response_ind").
	      transition().duration(750).
	    attr("x", x(resp_map[resp_id])-3).
	    attr("y", y(highest)-15);
    };

    function avg_all_by_total(obj) {
	keys(obj).map(function(key){
	    var total = d3.sum(obj[key]);
	    obj[key] = obj[key].map(function(count){ return count/total; });
	})
	return obj;
    }

    function to_samplename(base){ 
	return function mapper(_, i) {
	    return base+"."+i.toString()
	};
    }

    var pid = window.hmp2_cookie().get()
    , diet_instances = window.user_data.diet.instances
    , sample_ids = diet_instances.map(to_samplename(pid))
    , user_avg = avg_all_by_total(window.user_data.diet.averages)
    , global_avg = avg_all_by_total(window.average_data.diet)
    , diets = keys(user_avg)
    , firstdiet = diets[0];

    dropdown.selectAll("option").
	data(diets).
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
	data(resp_map.map(function(resp, i){
	    return [ {x: resp, y: user_avg[firstdiet][i]},
		     {x: resp, y: global_avg[firstdiet][i]} ]
	})).
	enter().append("svg:g").
	attr("class", "histgroup").
	attr("transform", function(row){ 
	    return "translate("+x(row[0].x)+",0)"; });


    window.diet_rects = window.hist_groups.selectAll("rect.diet").
	data(identity).
	  enter().append("rect").
	attr("class", "diet").
	attr("width", x1.rangeBand()).
	attr("x", function(_,i){ return x1(i); }).
	attr("y", function(d){ return y(d.y); }).
	attr("height", function(row){ return height-y(row.y); }).
	style("fill", function(_, i){ return histgroup_colors[i]; }).
	style("stroke", "#000");

    var i = diet_instances[0][firstdiet]
    , leftmost = window.diet_rects[i][0]
    , highest = sort(window.diet_rects[i], "height.baseVal.value")[0]
    , xval = leftmost.parentNode.transform.baseVal[0].matrix.e-10
    , yval = highest.y.baseVal.value-15;

    d3.select(window.diet_rects[0][0].parentNode).
	append("text").
	attr("id", "diet_response_ind").
	attr("x", xval+5).
	attr("y", yval).
	attr("font-size", "32").
	text("◊");

    var legend = svg.selectAll(".diet_legend").
	data(["Your Average", "Study Average"]).
	enter().append("g").
	attr("class", "avg_legend").
	attr("transform", function(_, idx){ 
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
}
