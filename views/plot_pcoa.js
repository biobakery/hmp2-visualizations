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

    function numerize(row){ 
	return { x  : +row.Dimension_1,
		 y  : +row.Dimension_2,
		 id : row.ID }
    }

    function search(searchterm){
	var hits = 0
	return function(item){ 
	    var pass = item.id.lastIndexOf(searchterm, 0) === 0;
	    message(hits += pass? 1 : 0);
	    return pass;
	}
    }

    function message(nhits){
	var el = document.getElementById("pcoa_searchresults")
	, basemsg = "Found "+nhits+" result"
	, msg = (nhits == 1)? basemsg+"." : basemsg+"s.";

	if (el.childNodes.length > 0)
	    for (i=0; i<=el.childNodes.length; i+=1)
		el.childNodes[i].remove();
	el.appendChild(document.createTextNode(msg));
    }

    d3.csv("pcoa.txt", numerize, function(err, data) {
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
	    attr("indexKey", function(row){ return row.id; }).
	    on("mouseover", function(d){ 
		return window.tooltip.
		    style("visibility", "visible").
		    text(d.id);
	    }).
	    on("mousemove", function(){ 
		return window.tooltip.
		    style("top", (d3.event.pageY-10)+"px").
		    style("left", (d3.event.pageX+10)+"px");
	    }).
	    on("mouseout", function(){ 
		return window.tooltip.style("visibility", "hidden"); 
	    }).
	      filter( search(window.hmp2_cookie().get()) ).
	    style("fill", "#0a0").
            attr("r", dotscale * 2);

    });

};

