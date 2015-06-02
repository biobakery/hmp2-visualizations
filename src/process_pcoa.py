import sys
import json
import contextlib
import multiprocessing
from itertools import combinations

import numpy as np
from cogent.cluster.nmds import NMDS

from util import take, get

def load_bioms(biom_fnames):
    biom_fs = map(open, biom_fnames)
    with contextlib.nested(*biom_fs):
        for f in biom_fs:
            data = json.load(f)
            yield dict([
                (taxa['id'], abd[-1])
                for taxa, abd in zip(data['rows'], data['data'])
            ])


def abundance_medoids(dicts):
    dicts = list(dicts)
    allkeys = set()
    for d in dicts:
        allkeys.update(d)
    for key in allkeys:
        abundances = map(get(key, 0), dicts)
        median = np.median(abundances)
        if median:
            yield key, median 


def distance(dict_a, dict_b):
    """bray-curtis as defined in the vegan R package, but performed on
    proportions, not raw counts

    """
    num, denom = 0, 0
    sum_a = float(sum(dict_a.itervalues()))
    sum_b = float(sum(dict_b.itervalues()))
    for key in set(dict_a).union(set(dict_b)):
        abd_a, abd_b = dict_a.get(key, 0), dict_b.get(key, 0)
        abd_a, abd_b = abd_a/sum_a, abd_b/sum_b
        num += abs(abd_a-abd_b)
        denom += abd_a+abd_b
    return num/denom
        

def distance_mapper(args):
    (i, abd_a), (j, abd_b) = args
    return (i,j), distance(abd_a, abd_b)


def dist_array(abd_dicts, n_dicts, n_procs=4):
    dist = np.zeros((n_dicts, n_dicts), dtype='float')
    pool = multiprocessing.Pool(n_procs)
    distances = pool.map(distance_mapper, combinations(enumerate(abd_dicts), 2))
    for (i, j), d in distances:
        dist[i,j] = d

    return dist+dist.T # reflect across diagonal


def rm_outliers(dist_arr, max_stddev=2.5):
    means = dist_arr.mean(axis=1)
    mask = ~ (means > means.mean()+(max_stddev*means.std()))
    return dist_arr[mask,:][:,mask], mask


def pcoa_coords(dist_arr):
    arr = NMDS(dist_arr, verbosity=0).getPoints()
    return map(list, arr)


def output(pcoa_arr):
    for name, (x, y) in pcoa_arr:
        print name, '\t', x, '\t', y


def main(biom_fnames, do_filter=False, n_procs=4):
    all_abds = load_bioms(biom_fnames)
    dist_arr = dist_array(all_abds, len(biom_fnames), n_procs=n_procs)
    if do_filter:
        dist_arr, mask = rm_outliers(dist_arr)
        biom_fnames = take(biom_fnames, mask)
    pcoa_arr = pcoa_coords(dist_arr)
    return zip(biom_fnames, pcoa_arr)


if __name__ == '__main__':
    biom_fnames = sys.argv[1:]

    chunks = [ biom_fnames[i:j]
               for i,j in zip(range(0,25,5), range(5,30,5)) ]
    medoids = [ dict(abundance_medoids(load_bioms(c))) for c in chunks ]

    coords = main(biom_fnames)
    output(coords)
    print "user coords"
    output(pcoa_coords(dist_array(medoids, len(chunks))))
    
