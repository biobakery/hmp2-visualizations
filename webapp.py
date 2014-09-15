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

@get('/')
@get('//')
@view('index.html')
def index():
    return dict()


@get('/bar.html')
@get('//bar.html')
@view('bar.html')
def plot_bar():
    return dict()



@get('/bar.txt')
@get('//bar.txt')
def bar():
    return static_file(
        'otu_table_merged_L2.txt',
        root = os.path.join(here,
                            settings.products_dir,
                            'otu_table_merged.biom_barcharts')
    )


@get('/pcoa.html')
@get('//pcoa.html')
@view('pcoa.html')
def plot_pcoa():
    return dict()



@get('/pcoa.txt')
@get('//pcoa.txt')
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
