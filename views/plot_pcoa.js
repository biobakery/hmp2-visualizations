window.plot_pcoa = function() {

    var margin = {top: 20, right: 20, bottom: 30, left: 10 }
    , width = 900 - margin.left - margin.right
    , height = 500 - margin.top - margin.bottom;

    var x = d3.scale.linear().
	range([0, width]);
    
    var y = d3.scale.linear().
	range([height, 0]);

    var xAxis = d3.svg.axis().
	scale(x).
	orient("bottom").
	tickFormat("");

    var yAxis = d3.svg.axis().
	scale(y).
	orient("left").
	tickFormat("");

    var svg = d3.select("#pcoa_chart_area").append("svg").
	attr("width", width + margin.left + margin.right).
	attr("height", height + margin.top + margin.bottom).
	append("svg:g").
	attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    function identity(data) {
	return data;
    }

    var pid = window.hmp2_cookie().get()
    function numerize(row, i) {
	return { x: row[0],
		 y: row[1],
		 id: pid+"."+i.toString() }
    }

    function index_by(objarr, attr) {
	var idx = new Object;
	objarr.map(function(obj){ idx[ obj[attr] ] = obj.id; });
	return idx;
    }

    function maybe_filtered() {
	var dataobj = new Object;
	if (window.user_data.pcoa_user !== undefined)
	    dataobj = {
		pcoa_user: [window.user_data.pcoa_user].map(numerize),
		pcoa_user_avg: window.average_data.pcoa_user.map(numerize),
	    };
	if (window.user_data.pcoa_user_filtered !== undefined)
	    dataobj = {
		pcoa_user: [window.user_data.pcoa_user_filtered].map(numerize),
		pcoa_user_avg: window.average_data.pcoa_user_filtered.map(numerize),
	    };
	if (window.user_data.pcoa_sample !== undefined) {
	    dataobj.pcoa_sample = window.user_data.pcoa_sample.map(numerize);
	    dataobj.pcoa_sample_avg = window.average_data.pcoa_sample.map(numerize);
	} else if (window.user_data.pcoa_sample_filtered !== undefined) {
	    dataobj.pcoa_sample = window.user_data.pcoa_sample_filtered.map(numerize);
	    dataobj.pcoa_sample_avg = window.average_data.pcoa_sample_filtered.
		map(numerize)
	}
	return dataobj;
    }

    var dataobj = maybe_filtered()
	, my_udata = dataobj.pcoa_user
	, my_sdata = dataobj.pcoa_sample
	, all_udata = dataobj.pcoa_user_avg
	, all_sdata = dataobj.pcoa_sample_avg
	, uxset = index_by(my_udata, 'x')
	, uyset = index_by(my_udata, 'y')
	, sxset = index_by(my_sdata, 'x')
	, syset = index_by(my_sdata, 'y')

    svg.append("svg:g").
	attr("class", "x axis").
	attr("transform", "translate(0,"+height+")").
	call(xAxis);

    svg.append("svg:g").
	attr("class", "y axis").
	call(yAxis);


    window.update_pcoa = function(el) {
	if (el.value == "by_sample") {
	    xset = sxset;
	    yset = syset;
	    data = all_sdata;
	} else {
	    xset = uxset;
	    yset = uyset;
	    data = all_udata;
	}

	function filterfunc(d){
	    var a = xset[d.x], b = yset[d.y];
	    return (a !== undefined && b !== undefined && a == b);
	}

	function mouseon(d){ 
	    return window.tooltip.
		style("visibility", "visible").
		text(xset[d.x]);
	}

	function mousemove(){ 
	    return window.tooltip.
		style("top", (d3.event.pageY-10)+"px").
		style("left", (d3.event.pageX+10)+"px");
	}
	
	function mouseout(){ 
	    return window.tooltip.style("visibility", "hidden"); 
	}

	
	x.domain(d3.extent(data, function(row){ return row.x; })).nice();
	y.domain(d3.extent(data, function(row){ return row.y; })).nice();

	var dotscale = 15/Math.log(data.length),
	    dots = svg.selectAll(".dot");
	
	if ( dots.data().length > 1 ) {
	    dots.remove();
	    dots.data([]);
	}
	svg.selectAll(".dot").
	    data(data).
	      enter().append("circle").
	    attr("class", "dot").
	    attr("cx", 465).
	    attr("cy", 225).
	    attr("r", dotscale).
	      filter(filterfunc).
	    on("mouseover", mouseon).
	    on("mousemove", mousemove).
	    on("mouseout", mouseout);

	svg.selectAll(".dot").
	    transition().duration(750).
	    attr("cx", function(row){ return x(row.x); }).
	    attr("cy", function(row){ return y(row.y); }).
	    transition().duration(750).
	    filter(filterfunc).
	    style("fill", "#0a0").
	    attr("r", dotscale * 2);
	    
    }
    window.update_pcoa(document.getElementById("pcoa_chart_selector"));
};

