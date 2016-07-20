<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
  <div class="container-fluid">
    <div class="navbar-header">
      <a class="navbar-brand" href="/" style="padding: 0px 10px;"> 
	<img src="/static/img/gut_cartoon.png" alt="IBDMDB.org" height="50" width="50">
      </a>
    </div>
    
    <form action="/search/" class="navbar-form navbar-right" role="search">
      <div class="form-group">
	<input class="form-control" placeholder="Search" type="text" name="q" value="">
      </div>
      <div class="form-group">
	<select class="form-control" name="type">
          <option value="">Everything</option>
          <option value="blog.BlogPost">Blog posts</option>
          <option value="pages.Page">Pages</option>
	</select>
      </div>
      <input type="submit" class="btn btn-default" value="Go">
    </form>

    
    <ul class="nav navbar-nav">
      <li id="dropdown-menu-home"><a href="/">Home</a></li>
      <li class="" id="-results"><a href="/results">Download Data</a></li>
      <li class="" id="-cb-browser"><a href="/cb/browser">Protocols</a></li>
      <li class="" id="project"><a href="/project/">Team</a></li>
      <li class="" id="https:--qiita.ibdmdb.org"><a href="https://qiita.ibdmdb.org">Explore Data</a></li>
      <li class="active" id="-participant"><a href="/participant">Participant Interface</a></li>
    </ul>
  </div>
</div>
