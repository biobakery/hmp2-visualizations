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
    for d in pipeline.task_dicts:
        yield d

