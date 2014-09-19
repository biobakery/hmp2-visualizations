#!/usr/bin/env python

import os
import re
import sys
import json

from bottle import (
    run,
    get,
    view,
    static_file
)

import settings

here = os.path.dirname(os.path.realpath(__file__))
def get_pipeline_state():
    try:
        with open(os.path.join(here, settings.statefile), 'r') as fhandle:
            return json.load(fhandle)
    except Exception as e:
        print >> sys.stderr, "Failed to load pipeline state %s: %s" %(
            settings.statefile, repr(e) )
        print >> sys.stderr, "Did you run the content gen pipeline with 'doit'?"
        sys.exit(1)

pipeline_state = get_pipeline_state()
mount = settings.web.prefix_url

@get(mount+'/')
@get(mount+'//')
@view('index.html')
def index():
    return {'settings': settings.web}


@get(mount+'/bar.html')
@get(mount+'//bar.html')
@view('bar.html')
def plot_bar():
    return {'settings': settings.web}



@get(mount+'/bar.txt')
@get(mount+'//bar.txt')
def bar():
    to_serve = pipeline_state['stacked_bar_chart'][0]
    to_serve = re.sub(r'\.biom$', '.txt', to_serve).replace('L1', 'L2')
    return static_file(
        os.path.basename(to_serve),
        root = os.path.dirname(to_serve)
    )


@get(mount+'/pcoa.html')
@get(mount+'//pcoa.html')
@view('pcoa.html')
def plot_pcoa():
    return {'settings': settings.web}



@get(mount+'/pcoa.txt')
@get(mount+'//pcoa.txt')
def pcoa():
    to_serve = [ product 
                 for product in pipeline_state['breadcrumbs_pcoa_plot']
                 if 'coords' in product ]
    to_serve = to_serve[0]
    return static_file(
        os.path.basename(to_serve),
        root = os.path.dirname(to_serve)
    )


def main():
    run(host=settings.web.host, port=settings.web.port,
        debug=settings.debug, reloader=settings.debug)


if __name__ == "__main__":
    ret = main()
    sys.exit(ret)
