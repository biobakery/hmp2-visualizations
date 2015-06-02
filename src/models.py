import os
import sys
import json
import operator
from itertools import takewhile

import leveldb

here = os.path.abspath(os.path.dirname(__file__))
sys.path.append(here)

from util import peek, partition

up = lambda path: os.path.split(path)[0]
DB_DIRECTORY = os.path.join(up(here), "leveldb")
GLOBAL_PID = "averages"


def save_all(users, binsize=1000):
    first, users = peek(iter(users))
    db = first.db
    for chunk in partition(users, binsize):
        batch = leveldb.WriteBatch()
        for user in takewhile(operator.truth, chunk):
            user.save()
        db.Write(batch, sync=True)


def _all_users_raw(db=None, db_dir=DB_DIRECTORY):
    if db is None:
        db = initialize_db(db_dir)
    return db.RangeIter()


def all_users(db=None, db_dir=DB_DIRECTORY):
    if db is None:
        db = initialize_db(db_dir)
    for pid, data in _all_users_raw(db):
        u = User(pid, db=db)
        u.state.update(deserialize(data))
        yield u
        

def initialize_db(db_dir=DB_DIRECTORY):
    return leveldb.LevelDB(db_dir)


def serialize(obj, to_fp=None):
    if to_fp:
        return json.dump(obj, to_fp)
    else:
        return json.dumps(obj)


def deserialize(s=None, from_fp=None):
    if s:
        return json.loads(s)
    elif from_fp:
        return json.load(from_fp)
        

class DBMixin(object):
    @property
    def db(self):
        if self._db is None:
            self._db = initialize_db(self.db_dir)
        return self._db


class RefreshDict(DBMixin, dict):

    def __init__(self, key, db_dir=DB_DIRECTORY, db=None, *args, **kwargs):
        self._db = db
        self.db_dir = db_dir
        self.key = key
        return super(RefreshDict, self).__init__(*args, **kwargs)

    def refresh(self):
        try:
            s = self.db.Get(self.key)
        except KeyError:
            pass
        else:
            self.update(deserialize(s))

    def __getitem__(self, key):
        if key not in self:
            self.refresh()
        return super(RefreshDict, self).__getitem__(key)


class User(DBMixin, object):

    TAXA_KEY = "taxa"
    DIET_KEY = "diet"
    PCOA_USER_KEY = "pcoa_user"
    PCOA_SAMPLE_KEY = "pcoa_sample"
    MTIME_KEY = "mtime"

    class filtered:
        PCOA_USER_KEY = "pcoa_user_filtered"
        PCOA_SAMPLE_KEY = "pcoa_sample_filtered"
    

    def __init__(self, pid, db=None, db_dir=DB_DIRECTORY, load=False):
        self.pid = pid
        self._db = db
        self.state = RefreshDict(pid, db=db)
        if load:
            self.state.refresh()

    def save(self):
        return self.db.Put(str(self.pid), serialize(self.state))

    @staticmethod
    def raw(pid, db=None, db_dir=DB_DIRECTORY):
        if db is None:
            db = initialize_db(db_dir)
        return db.Get(pid)
