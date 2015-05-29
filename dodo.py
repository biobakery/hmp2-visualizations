import os
import sys
import json
from datetime import datetime
from operator import add, itemgetter
from collections import defaultdict

from anadama import util

import settings

here = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.join(here, "src"))

import models
from util import update_with, peek, partition_by, avg_by_vals, count, get
import process_diet
import process_pcoa

NOW = datetime.utcnow().strftime("%s")

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
    phylum = lambda row: next(iter(
        item.replace('p__', '') for item in row['metadata']['taxonomy']
        if item.startswith('p__')
    ))
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
    global_user.state[models.User.MTIME_KEY] = NOW
    global_user.save()


def update_db_pcoa():
    global_user = models.User(models.GLOBAL_PID, db=db, load=True)

    otu_tables = zip(*metadata)[1]
    sample_pcoa = process_pcoa.main(otu_tables)
    global_user.state[models.User.PCOA_SAMPLE_KEY] = sample_pcoa

    medoids = list()
    for userchunk in partition_by(metadata, getpid):
        otu_tables = zip(*userchunk)[1]
        abundance_dicts = process_pcoa.load_bioms(otu_tables)
        medoids.append(dict(process_pcoa.abundance_medoids(abundance_dicts)))
    n = len(medoids)
    user_pcoa = process_pcoa.pcoa_coords( process_pcoa.dist_array(medoids, n) )
    global_user.state[models.User.PCOA_USER_KEY] = user_pcoa

    def _idxs():
        prev = 0
        for i, chunk in enumerate(partition_by(metadata, getpid)):
            first, chunk = peek(chunk)
            name = first[-1].split('.',1)[0]
            n = count(chunk)
            yield i, name, range(prev, prev+n)
            prev += n

    def _users():
        for user_idx, user_id, sample_idxs in _idxs():
            sample_pcoa_points = get(sample_idxs, sample_pcoa)
            user = models.User(user_id, db=db, load=True)
            user.state[models.User.PCOA_SAMPLE_KEY] = sample_pcoa_points
            user.state[models.User.PCOA_USER_KEY] = user_pcoa[user_idx]
            yield user
    
    models.save_all(_users())
    global_user.state[models.User.MTIME_KEY] = NOW
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
    global_user.state[models.User.MTIME_KEY] = NOW
    global_user.save()


def has_data(key):
    global_user = models.User(models.GLOBAL_PID, db=db, load=True)
    f = lambda *a, **k: all((key in global_user.state,
                             models.User.MTIME_KEY in global_user.state))
    return f


def task_gen():
    otu_tables = zip(*metadata)[1]
    yield {
        "name": "update_db_taxa",
        "actions": [update_db_taxa],
        "file_dep": otu_tables,
        "uptodate": [has_data(models.User.TAXA_KEY)]
    }

    yield {
        "name": "update_db_diet",
        "actions": [lambda: update_db_diet(settings.diet_data)],
        "file_dep": [settings.diet_data],
        "uptodate": [has_data(models.User.DIET_KEY)]
    }

    yield {
        "name": "update_db_pcoa",
        "actions": [update_db_pcoa],
        "file_dep": otu_tables,
        "uptodate": [has_data(models.User.PCOA_USER_KEY),
                      has_data(models.User.PCOA_SAMPLE_KEY)]
    }


    
