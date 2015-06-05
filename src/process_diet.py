import re
import sys
from collections import namedtuple

DietSample = namedtuple(
    'DietSample', 
    ["SampleID",                "Caffiene",       "Sugary_drinks", 
     "Sugar_substitute_drinks", "Juice",          "Water",
     "Alcohol",                 "Cultured_foods", "Dairy",
     "Probiotic",               "Fruits",         "Vegetables",    
     "Beans",                   "Whole_grains",   "Starch",
     "Eggs",                    "Processed_meat", "Red_meat",      
     "White_meat",              "Shellfish",      "Fish",
     "Sweets"                                                      ]
)

idxs = range(22)

def take(idxs, indexable):
    return [indexable[idx] for idx in idxs]

def score(s):
    s = s.lower()
    if not s or 'no' in s:
        return 0
    match = re.match(r'.*past (\d+) .*', s)
    if match:
        if match.group(1) == '2':
            return 2
        else:
            return 1
    match = re.match(r'.*yesterday, (\d+) .*', s)
    if match:
        if match.group(1) == "1":
            return 3
        else:
            return 4

    return 0


def load_samples(fname):
    with open(fname) as f:
        f.readline() #skip header
        for i, line in enumerate(f):
            try:
                fields = [ field.strip() for field in line.split('\t') ]
                fields = [ v if i==0 else score(v) 
                           for i, v in enumerate(take(idxs, fields)) ] 
                yield DietSample( *fields )
            except Exception as e:
                raise Exception("Error parsing tsv at line %i: %s"%(
                    i, repr(e)))


def main(data_fname):
    samples = list(load_samples(data_fname))

    print "#"+"\t".join([ s.replace('_', ' ') for s in samples[0]._fields ])
    for sample in samples:
        print "\t".join(map(str, sample))

if __name__ == '__main__':
    ret = main(sys.argv[1])
    sys.exit(ret)
