#!/usr/bin/env python

import os
import sys

from bottle import (
    run,
    get,
    view,
    static_file
)

import settings

here = os.path.dirname(os.path.realpath(__file__))
mount = settings.prefix_url

@get(mount+'/')
@get(mount+'//')
@view('index.html')
def index():
    return dict()


@get(mount+'/bar.html')
@get(mount+'//bar.html')
@view('bar.html')
def plot_bar():
    return dict()



@get(mount+'/bar.txt')
@get(mount+'//bar.txt')
def bar():
    return static_file(
        'otu_table_merged_L2.txt',
        root = os.path.join(here,
                            settings.products_dir,
                            'otu_table_merged.biom_barcharts')
    )


@get(mount+'/pcoa.html')
@get(mount+'//pcoa.html')
@view('pcoa.html')
def plot_pcoa():
    return dict()



@get(mount+'/pcoa.txt')
@get(mount+'//pcoa.txt')
def pcoa():
    return static_file(
        "otu_table_merged.biom.pcl_pcoa_coords.txt",
        root = os.path.join(here, settings.products_dir)
    )


def main():
    run(host=settings.web.host, port=settings.web.port,
        debug=settings.debug, reloader=settings.debug)


if __name__ == "__main__":
    ret = main()
    sys.exit(ret)
