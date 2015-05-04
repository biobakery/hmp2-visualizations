import os
import re
import csv
import sys
import json
from collections import defaultdict
from operator import add, itemgetter
from itertools import chain

from anadama import util
from anadama_workflows.pipelines import VisualizationPipeline

import settings

here = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.join(here, "src"))

import models
from util import update_with, peek, partition_by, avg_by_vals
import process_diet


with open(settings.map_file) as f:
    raw_meta = list(util.deserialize_map_file(f))

def samplekey(sample):
    sample_id, instance = map(float, sample[0].split('.'))
    return (sample_id*10)+instance

metadata = sorted(raw_meta, key=samplekey)
HASHED_MAP = dict([ (name, hashed) for name, _, hashed in metadata ])
HASHED_MAP.update([ (os.path.splitext(os.path.basename(f))[0], hashed)
                    for _, f, hashed in metadata ])
DOIT_CONFIG = {
    'default_tasks': ['gen'],
    'continue'     : True,
    'pipeline_name': "HMP2 Visualizations"
}

db = models.initialize_db(settings.database_dir)

firstitem = itemgetter(0)

def phylum_abd(biom_fname):
    phylum = lambda row: next(iter( item for item in row['metadata']['taxonomy']
                                    if item.startswith('p__') ))
    with open(biom_fname) as f:
        data = json.load(f)

    phyl_totals = defaultdict(int)
    for row, datapoint in zip(data['rows'], data['data']):
        phyl_totals[phylum(row)] += float(datapoint[-1])

    return avg_by_vals(phyl_totals)


def getpid(sample):
    return sample[-1].split('.')[0]


def update_db_taxa(metadata=metadata):
    global_phylum = dict()
    def _users():
        for chunk in partition_by(metadata, getpid):
            first, chunk = peek(chunk)
            pid, instance_num = first[-1].split(".")
            user = models.User(pid, db=db, load=True)
            user_avg = dict()
            user.state[models.User.TAXA_KEY] = { "instances": list(),
                                                 "averages": None }
            for sampleid, otu_fname, hashed in chunk:
                phy_dist = phylum_abd(otu_fname)
                user.state[models.User.TAXA_KEY]["instances"].append(phy_dist)
                update_with(user_avg, phy_dist, add, missingval=0)
                update_with(global_phylum, phy_dist, add, missingval=0)
            user.state[models.User.TAXA_KEY]["averages"] = avg_by_vals(user_avg)
            yield user

    models.save_all(_users())
    global_user = models.User(models.GLOBAL_PID, db=db, load=True)
    global_user.state[models.User.TAXA_KEY] = avg_by_vals(global_phylum)
    global_user.save()


def update_db_pcoa(pcoa_fname):
    global_user = models.User(models.GLOBAL_PID, db=db, load=True)
    global_user.state[models.User.PCOA_KEY] = list()
    def _pcoa():
        with open(pcoa_fname, 'rb') as f:
            f.readline() # discard first line
            reader = csv.reader(f)
            for name, x, y in reader:
                hashed_name = HASHED_MAP.get(name)
                if not hashed_name:
                    continue
                name, instance = hashed_name.split('.')
                x, y = float(x), float(y)
                global_user.state[models.User.PCOA_KEY].append( (x,y) )
                yield name, instance, (x,y)

    
    def _users():
        for user_pcoa in partition_by(_pcoa(), firstitem):
            first, user_pcoa = peek(user_pcoa)
            print first[0]
            user = models.User(first[0], db=db, load=True)
            user.state[models.User.PCOA_KEY] = [ l[-1] for l in user_pcoa ]
            yield user
            
    models.save_all(_users())
    global_user.save()


def update_db_diet(diet_fname):
    first, samples = peek(process_diet.load_samples(diet_fname))
    fields = first._fields[1:]
    global_avg = dict([ (k, [0,0,0,0,0]) for k in fields ])

    def _update_count(current, new):
        current[new] += 1
        return current
    
    def _users():
        for sample in partition_by(samples, firstitem):
            first, sample = peek(sample)
            pid = HASHED_MAP.get(first[0]+'.1', '.').split('.')[0]
            if not pid:
                continue
            user = models.User(pid, db=db, load=True)
            user.state[models.User.DIET_KEY] = { "instances": list(),
                                                 "averages": None }
            user_avg = dict([ (k, [0,0,0,0,0]) for k in fields ])
            for instance in sample:
                d = dict(zip(fields, instance[1:]))
                user.state[models.User.DIET_KEY]['instances'].append(d)
                update_with(user_avg, d, _update_count)
                update_with(global_avg, d, _update_count)
            user.state[models.User.DIET_KEY]["averages"] = user_avg
            yield user
            
    models.save_all(_users())
    global_user = models.User(models.GLOBAL_PID, db=db, load=True)
    global_user.state[models.User.DIET_KEY] = global_avg
    global_user.save()


def task_gen():
    otu_tables = zip(*metadata)[1]
    yield {
        "name": "update_db_taxa",
        "file_dep": otu_tables,
        "actions": [update_db_taxa]
    }

    yield {
        "name": "update_db_diet",
        "file_dep": [settings.diet_data],
        "actions": [lambda: update_db_diet(settings.diet_data)]
    }

    pipeline = VisualizationPipeline(settings.map_file,
                                     otu_tables=otu_tables,
                                     products_dir=settings.products_dir)
    pipeline.configure()
    pcoa_file = None
    for t in pipeline:
        if 'stacked' in t['name']:
            continue
        yield t
        if any("coords" in p for p in t['targets']):
            pcoa_file = next(iter( p for p in t['targets'] if "coords" in p ))

    yield {
        "name": "update_db_pcoa",
        "file_dep": [pcoa_file],
        "actions": [lambda: update_db_pcoa(pcoa_file)]
    }

    
