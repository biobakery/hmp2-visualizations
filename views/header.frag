<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
  <div class="container">
    <div class="navbar-collapse collapse">
      
      <form action="/search/" class="navbar-form navbar-right" role="search">
	<div class="form-group">
	  <input class="form-control" 
		 placeholder="Search" type="text" name="q" value="">
	</div>

	<div class="form-group">
	  <select class="form-control" name="type">
            <option value="">Everything</option>
            <option value="blog.BlogPost"> Blog posts </option>
            <option value="pages.Page"> Pages </option>
	  </select>
	</div>

	<input type="submit" class="btn btn-default" value="Go">
      </form>

      
      <ul class="nav navbar-nav">
	<li class="dropdown active" id="-">
	  <a href="/" class="dropdown-toggle disabled" data-toggle="dropdown">
            IBDMDB<b class="caret"></b>
	  </a>
	  <ul class="dropdown-menu">
	    <li class="" id="team"><a href="/team/">Team</a></li>
	    <li class="" id="about"><a href="/about/">About</a></li>
	    <li class="" id="enrollment">
	      <a href="/enrollment/">Contact / Enrollment</a>
	    </li>
	  </ul>
	</li>
	<li class="dropdown" id="project">
	  <a href="/project/" class="dropdown-toggle disabled" 
	     data-toggle="dropdown">
            Project <b class="caret"></b>
	  </a>
	  <ul class="dropdown-menu">
	    <li class="" id="project-project-aims">
	      <a href="/project/project-aims/">Project Aims</a>
	    </li>
	    <li class="dropdown-submenu" id="project-clinical-cohorts">
	      <a href="/project/clinical-cohorts/">Clinical Cohorts</a>
	      <ul class="dropdown-menu">
		<li class=" " id="project-clinical-cohorts-mgh">
		  <a href="/project/clinical-cohorts/mgh/">MGH</a>
		</li>
		<li class=" " id="project-clinical-cohorts-cincinati">
		  <a href="/project/clinical-cohorts/cincinati/">Cincinati</a>
		</li>
		<li class=" " id="project-clinical-cohorts-cedars-sinai">
		  <a href="/project/clinical-cohorts/cedars-sinai/"> 
		    Cedars-Sinai
		  </a>
		</li>
		<li class=" " id="project-clinical-cohorts-swedish-data">
		  <a href="/project/clinical-cohorts/swedish-data/">
		    Swedish Twins
		  </a>
		</li>
	      </ul>
	    </li>
	  </ul>
	</li>
	<li class=" "id="-cb-browser"> 
	  <a href="/cb/browser">Protocols</a> 
	</li>
	<li class=" " id="blog"> <a href="/blog/">News</a></li>
      </ul>
  
    </div>
  </div>
</div>
