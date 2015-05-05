window.plot_pcoa = function() {

    var margin = {top: 20, right: 20, bottom: 30, left: 40 }
    , width = 960 - margin.left - margin.right
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

    var udata = window.user_data.pcoa === undefined? [] : window.user_data.pcoa
    , udata = udata.map(numerize)
    , data = window.average_data.pcoa.map(numerize)
    , xset = index_by(udata, 'x')
    , yset = index_by(udata, 'y')

    x.domain(d3.extent(data, function(row){ return row.x; })).nice();
    y.domain(d3.extent(data, function(row){ return row.y; })).nice();

    svg.append("svg:g").
	attr("class", "x axis").
	attr("transform", "translate(0,"+height+")").
	call(xAxis);

    svg.append("svg:g").
	attr("class", "y axis").
	call(yAxis);

    var dotscale = 15/Math.log(data.length);
    svg.selectAll(".dot").
	data(data).
	enter().append("circle").
	attr("class", "dot").
	attr("r", dotscale).
	attr("cx", function(row){ return x(row.x); }).
	attr("cy", function(row){ return y(row.y); }).
	filter( function(d){
	    var a = xset[d.x], b = yset[d.y];
	    return (a !== undefined && b !== undefined && a == b);
	}).
	on("mouseover", function(d){ 
	    return window.tooltip.
		style("visibility", "visible").
		text(xset[d.x]);
	}).
	on("mousemove", function(){ 
	    return window.tooltip.
		style("top", (d3.event.pageY-10)+"px").
		style("left", (d3.event.pageX+10)+"px");
	}).
	on("mouseout", function(){ 
	    return window.tooltip.style("visibility", "hidden"); 
	}).
	style("fill", "#0a0").
	attr("r", dotscale * 2);

};

