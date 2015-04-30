import os
import re
import sys

from anadama import util

import settings

here = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.join(here, "src"))

import models


snd = lambda val: float(val[1])
with open(settings.map_file) as f:
    raw_meta = list(util.deserialize_map_file(f))

metadata = sorted(raw_meta, key=snd)

DOIT_CONFIG = {
    'default_tasks': ['gen'],
    'continue'     : True,
    'pipeline_name': "HMP2 Visualizations"
}

