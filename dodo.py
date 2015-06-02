import os
import re
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
from util import update_with, peek, partition_by, avg_by_vals, take, dedupe
import process_diet
import process_pcoa

NOW = datetime.utcnow().strftime("%s")

with open(settings.map_file) as f:
    raw_meta = list(util.deserialize_map_file(f))

def samplekey(sample):
    sample_id, instance = map(int, sample[0].split('.'))
    return (sample_id*1000)+instance

metadata = sorted(raw_meta, key=samplekey)
HASHED_MAP = dict([ (name.split('.', 1)[0], hashed)
                    for name, _, hashed in metadata ])

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


def update_db_pcoa(n_procs=4):
    def medoids(abd_tables, metadata):
        for userchunk in partition_by(zip(abd_tables, metadata), getpid):
            otu_tables = zip(*userchunk)[0]
            median = dict(process_pcoa.abundance_medoids(otu_tables))
            yield median

    dictify = lambda pids, points_list: dict(zip(pids, points_list))    

    pids = dedupe(map(getpid, metadata))
    _, otu_tables, instances = zip(*metadata)
    bioms = list(process_pcoa.load_bioms(otu_tables))

    sampledist = process_pcoa.dist_array(bioms, len(bioms), n_procs=n_procs)
    samplepcoa = dictify(instances, process_pcoa.pcoa_coords(sampledist))
    meds = list(medoids(bioms, instances))
    userdist = process_pcoa.dist_array(meds, len(meds), n_procs=n_procs)
    userpcoa = dictify(pids, process_pcoa.pcoa_coords(userdist))

    sampledist, mask = process_pcoa.rm_outliers(sampledist)
    instances = take(instances, mask)
    userdist, mask = process_pcoa.rm_outliers(userdist)
    pids = take(pids, mask)
    f_userpcoa = dictify(pids, process_pcoa.pcoa_coords(userdist))
    f_samplepcoa = dictify(instances, process_pcoa.pcoa_coords(sampledist))

    global_user = models.User(models.GLOBAL_PID, db=db, load=True)
    global_user.state[models.User.PCOA_SAMPLE_KEY] = samplepcoa.values()
    global_user.state[models.User.PCOA_USER_KEY] = userpcoa.values()
    global_user.state[
        models.User.filtered.PCOA_SAMPLE_KEY] = f_samplepcoa.values()
    global_user.state[models.User.filtered.PCOA_USER_KEY] = f_userpcoa.values()

    def _users():
        for userchunk in partition_by(metadata, getpid):
            first, rest = peek(userchunk)
            rest = list(rest)
            pid = getpid(first)
            user = models.User(pid, db=db, load=True)
            if pid in f_userpcoa:
                user.state[models.User.filtered.PCOA_USER_KEY] = f_userpcoa[pid]
            else:
                user.state[models.User.PCOA_USER_KEY] = userpcoa[pid]

            instances = [k[-1] for k in rest]
            if not all(k in f_samplepcoa for k in instances):
                user.state[models.User.PCOA_SAMPLE_KEY] = [ samplepcoa[k]
                                                            for k in instances ]
            else:
                user.state[models.User.filtered.PCOA_SAMPLE_KEY] = [
                    f_samplepcoa[k] for k in instances ]
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
            pid = HASHED_MAP.get(first[0], '.').split('.')[0]
            if not pid:
                # skip samples in diet_data that are missing in
                # taxonomy data
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
