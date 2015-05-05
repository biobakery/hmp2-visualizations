#!/usr/bin/env python

import os
import re
import sys
import json

from bottle import (
    run,
    get,
    view,
    abort,
    static_file
)

import settings

here = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.join(here, "src"))

import models

mount = settings.web.prefix_url
_db = None
def db():
    global _db
    if not _db:
        _db = models.initialize_db(settings.database_dir)
    return _db

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
    def stylesheets(filename):
        print filename
        return static_file(filename, root='src/fonts')


@get(mount+'/')
@get(mount+'//')
@view('index.html')
def index():
    return {'settings': settings.web}


@get(mount+"/user/<pid>")
@get(mount+"//user/<pid>")
def user(pid):
    try:
        return models.User.raw(pid, db=db())
    except KeyError:
        abort(404, "User not found")


avg_user = None
@get(mount+"/averages")
@get(mount+"//averages")
def averages():
    global avg_user
    if not avg_user:
        avg_user = models.User.raw(models.GLOBAL_PID, db=db())
    return avg_user


def main():
    run(host=settings.web.host, port=settings.web.port,
        debug=settings.debug, reloader=settings.debug)


if __name__ == "__main__":
    ret = main()
    sys.exit(ret)
