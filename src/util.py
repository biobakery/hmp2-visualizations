from collections import OrderedDict
from itertools import chain, izip_longest, izip, repeat, groupby

identity = lambda item: item

def avg_by_vals(dct):
    total = sum(dct.itervalues())
    return dict( (name, float(sm)/total)
                  for name, sm in dct.iteritems() )


def update_with(dct, other, func, missingval=None):
    for key, val in other.iteritems():
        current = dct.get(key, missingval)
        dct[key] = func(current, val)
    return dct


def peek(iterable):
    first = next(iterable)
    return first, chain([first], iterable)


def partition_by(to_partition, func=identity):
    """When func output changes between items in to_partition, insert
    iterable break

    """
    for _, chunk in groupby(to_partition, key=func):
        yield chunk


def partition(iterable, binsize):
    iters = [iter(iterable)]*binsize
    return izip_longest(fillvalue=None, *iters)    


def count(iterable):
    return sum(1 for _ in iterable)


def which(to_take_iter, idxs):
    """`idxs` **must** be sorted. """
    idxs = iter(idxs)
    j = next(idxs)
    for i, item in enumerate(to_take_iter):
        if i == j:
            yield item
            j = next(idxs)


def take(to_take_iter, should_take_iter):
    for to_yield, should_yield in izip(to_take_iter, should_take_iter):
        if should_yield:
            yield to_yield


def get(k, default): # for use with map
    return lambda dict_: dict_.get(k, default)


def dedupe(it):
    return OrderedDict(izip(it, repeat(None))).keys()
