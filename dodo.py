import re
import json
import operator

from anadama import util
from anadama_workflows.pipelines import VisualizationPipeline

import settings


snd = operator.itemgetter(1)

with open(settings.map_file) as f:
    raw_meta = [ line.strip().split('\t') for line in f
                 if not line.startswith('#') ]

sample_names, otu_tables = zip( *((row[0], row[2]) for row in 
                                sorted(raw_meta, key=snd)) )

pipeline = VisualizationPipeline(settings.map_file,
                                 otu_tables=otu_tables,
                                 products_dir=settings.products_dir)
DOIT_CONFIG = {
    'default_tasks': ['gen'],
    'continue'     : True,
    'pipeline_name': "HMP2 Visualizations"
}

def average_by_rows(in_fname, out_fname):

    def run(to_average, output):
        with open(to_average) as av_f, open(output, 'w') as out_f:
            av_f.readline() # skip the header line
            print >> out_f, "\t".join(("Taxon", "Average"))
            for row in av_f:
                fields = row.split()
                key, vals = fields[0], map(float, fields[1:])
                print >> out_f, "%s\t%.5f"%(key, sum(vals)/len(vals))
        

    return {
        'name': 'average_by_rows:'+out_fname,
        'file_dep': [in_fname],
        'targets': [out_fname],
        'actions': [(run, (in_fname,out_fname))]
    }


def task_gen():
    pipeline.configure()
    state = condense_state(pipeline.task_dicts)
    for d in pipeline.task_dicts:
        yield d

    to_average = state['stacked_bar_chart'][0]
    to_average = re.sub(r'\.biom$', '.txt', to_average).replace('L1', 'L2')
    task_dict = average_by_rows(
        to_average,
        util.new_file("all_otus_average_L2.txt",
                      basedir=settings.products_dir)
    )
    yield task_dict

    state[ base(task_dict, 1) ] = task_dict['targets']
    save_state(state, file=settings.statefile)

def base(task_dict, idx=0):
    return task_dict['name'].split(':')[idx]

def condense_state(list_of_task_dicts):
    return dict([ 
        (base(task), task['targets']) 
        for task in list_of_task_dicts 
    ])

def save_state(state_dict, file):
    with open(file, 'w') as output_statefile_handle:
        return json.dump(state_dict, output_statefile_handle)

        
