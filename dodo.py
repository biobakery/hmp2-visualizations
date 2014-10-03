import os
import re
import json

from anadama import util
from anadama_workflows.pipelines import VisualizationPipeline

import settings

here = os.path.dirname(os.path.realpath(__file__))

snd = lambda val: float(val[1])

with open(settings.map_file) as f:
    raw_meta = list(util.deserialize_map_file(f))

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

def rename_biom_id(fname, sample_id):
    
    def run(biom_fname, sample_id):
        import json
        with open(biom_fname, 'r') as f:
            biom = json.load(f)
            biom['columns'][0]['id'] = sample_id
        with open(biom_fname, 'w') as f:
            json.dump(biom, f)

    return {
        'name': 'rename_biom_id:'+fname,
        'file_dep': [fname],
        'actions': [(run, (fname,sample_id))]
    }


def average_by_rows(in_fname, out_fname):

    def run():
        with open(in_fname) as av_f, open(out_fname, 'w') as out_f:
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
        'actions': [run]
    }


def diet_workflow(data_fname, metadata):
    output = util.new_file("diet.txt", basedir=settings.products_dir)
    output_renamed_ids = util.new_file("diet_ids.txt", 
                                       basedir=settings.products_dir)
    
    def _rename():
        import re
        
        mangle = lambda val: re.sub(r'(.+)\.\d+', r'\1', val)
        idx = dict([ (mangle(r[0]), mangle(r[3])) for r in metadata ])
        i = 0
        with open(data_fname) as f_in, open(output_renamed_ids, 'w') as f_out:
            f_out.writelines([f_in.readline()])
            for line in f_in:
                match = re.match(r'^(\d+)(\t.*)', line)
                if match and match.group(1) in idx:
                    new_name = "%s.%i" %(idx[match.group(1)], i)
                    print >> f_out, new_name+match.group(2)
                    i += 1

    yield {
        'name': 'diet_workflow:rename_ids:'+output_renamed_ids,
        'file_dep': [data_fname],
        'targets': [output_renamed_ids],
        'actions': [_rename]
    }
    
    process_script = os.path.join(here, "process_diet.py")
    cmd = "python %s %s > %s"%(process_script, output_renamed_ids, output)
    yield {
        'name': 'diet_workflow:process:'+output,
        'file_dep': [output_renamed_ids],
        'targets': [output],
        'actions': [cmd]
    }
    

def task_gen():
    for sample in raw_meta:
        yield rename_biom_id(sample[2], sample[3])

    state = list()
    tasks = list(diet_workflow(settings.diet_data, raw_meta))
    state.extend(tasks)
    yield iter(task for task in tasks)

    pipeline.configure()
    state.extend(pipeline.task_dicts)
    state = condense_state(state)
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

