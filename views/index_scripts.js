window.hmp2_cookie = function(){ 

    var get = function() {
	var val =  document.cookie.match(/sample_id=([^;]+);?.*/);
	if ( val && val.length > 1){ 
	    return val[1];
	}else{
	    return "";
	}
    };
    
    var set = function(value) {
	return document.cookie = "sample_id="+value+";"
    };
    
    var clear = function() {
	document.cookie = "sample_id=; expires=Wed; 01 Jan 1970";
    }

    return {   get  : get
	     , set  : set
	     , clear: clear };
}

window.handle_hmp2_cookie = function() {
    var c = window.hmp2_cookie()
    , sample_id = c.get();

    if (sample_id) {
	document.getElementById("sel_sample").value = sample_id;
	window.login();
    } 
}

window.login = function(){
    var sample_id = document.getElementById("sel_sample").value;
    if (!sample_id) { return; }

    window.hmp2_cookie().set(sample_id);
    $("#logged_in").removeClass("glyphicon-off").addClass("glyphicon-ok");
    $("#logged_in_button").removeClass("btn-primary").addClass("btn-success");
    window.clearplots();
    window.fillplots();
}

window.clear_hmp2_cookie = function(){
    window.hmp2_cookie().clear();
    document.getElementById("sel_sample").value = "";
    $("#logged_in").removeClass("glyphicon-ok").addClass("glyphicon-off");
    $("#logged_in_button").removeClass("btn-success").addClass("btn-primary");
    window.clearplots();
}

window.clearplots = function() {
    $(".plot_area").empty();
    $(".plot_caption").css("display", "none");
}

window.fillplots = function() {
    $(".plot_caption").css("display", "");
    window.plot_bar();
    window.plot_pcoa();
    window.plot_avg();
    window.plot_diet();
}

window.tooltip = d3.select("body").
    append("div").
    style("position", "absolute").
    style("z-index", "10").
    style("visibility", "hidden").
    text("");
