#!/usr/bin/env python

import os
import sys
import json
import calendar
from datetime import datetime

from bottle import (
    run,
    get,
    view,
    abort,
    request,
    response,
    parse_date,
    static_file,
    HTTPResponse
)

import settings

here = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.join(here, "src"))

import models

mount = settings.web.prefix_url

_state = None
def state():
    global _state
    if _state is None:
        _state = GlobalState()
    return _state


class GlobalState(object):
    def __init__(self):
        self.db = models.initialize_db(settings.database_dir)
        self.avg_user = models.User.raw(models.GLOBAL_PID, db=self.db)
        self.last_updated_d = datetime.fromtimestamp(
            float(json.loads(self.avg_user)[models.User.MTIME_KEY])
        )
        self.last_updated_float = float(
            calendar.timegm(self.last_updated_d.timetuple()))
        self.last_updated = self.last_updated_d.strftime("%a, %d %b %y %T GMT")


def maybe_notmodified(handler_f):
    def wrapper(*args, **kwargs):
        ims = request.environ.get("HTTP_IF_MODIFIED_SINCE")
        if ims:
            ims = parse_date(ims.split(";", 1)[0].strip())
        if ims is not None and ims > state().last_updated_float:
            return HTTPResponse(
                status=304,
                Date=datetime.utcnow().strftime("%a, %d %b %y %T GMT")
            )
        return handler_f(*args, **kwargs)
    return wrapper


if settings.debug:
    @get('/js/<filename:re:.*\.js>')
    @get('/mezzanine/js/<filename:re:.*\.js>')
    def javascripts(filename):
        print filename
        return static_file(filename, root='src/js')
        
    @get('/css/<filename:re:.*\.css>')
    def stylesheets(filename):
        print filename
        return static_file(filename, root='src/css')
        
    @get('/fonts/<filename>')
    def fonts(filename):
        print filename
        return static_file(filename, root='src/fonts')


@get(mount+'/')
@get(mount+'//')
@view('index.html')
@maybe_notmodified
def index():
    response.set_header("Last-Modified", state().last_updated)
    return {'settings': settings.web}


@get(mount+"/user/<pid>")
@get(mount+"//user/<pid>")
@maybe_notmodified
def user(pid):
    try:
        u = models.User.raw(pid, db=state().db)
    except KeyError:
        abort(404, "User not found")
    response.set_header("Last-Modified", state().last_updated)
    return u


@get(mount+"/averages")
@get(mount+"//averages")
@maybe_notmodified
def averages():
    response.set_header("Last-Modified", state().last_updated)    
    return state().avg_user


def main():
    run(host=settings.web.host, port=settings.web.port,
        debug=settings.debug, reloader=settings.debug)


if __name__ == "__main__":
    ret = main()
    sys.exit(ret)
