import json
import operator

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

def task_gen():
    pipeline.configure()
    save_state_file(pipeline.task_dicts)
    for d in pipeline.task_dicts:
        yield d

def save_state_file(list_of_task_dicts):
    with open(settings.statefile, 'w') as output_statefile_handle:
        return json.dump(
            dict([ (task['name'].split(':')[0], task['targets']) 
                   for task in list_of_task_dicts]),
            output_statefile_handle
        )
        
