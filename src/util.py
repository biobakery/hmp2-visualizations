from itertools import takewhile, chain, izip_longest

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
    to_partition = iter(to_partition)
    while True:
        first, to_partition = peek(to_partition)
        first = func(first)
        yield takewhile(lambda item: func(item) == first, to_partition)
        

def partition(iterable, binsize):
    iters = [iter(iterable)]*binsize
    return izip_longest(fillvalue=None, *iters)    


    
