import os
import operator
import json
from itertools import takewhile, izip_longest, chain

import leveldb


here = os.path.abspath(os.path.dirname(__file__))
up = lambda path: os.path.split(path)[0]
DB_DIRECTORY = os.path.join(up(here), "leveldb")
GLOBAL_PID = "averages"


def partition(iterable, binsize):
    iters = [iter(iterable)]*binsize
    return izip_longest(fillvalue=None, *iters)    


def save_all(users, binsize=1000):
    first = next(iter(users))
    db = first.db
    users = chain([first], users)
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
        

def initialize_db(db_dir):
    return leveldb.LevelDB(db_dir)


def serialize(obj, to_fp=None):
    if to_fp:
        return json.dump(obj, to_fp, default=_defaultfunc)
    else:
        return json.dumps(obj, default=_defaultfunc)


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


class RefreshDict(dict, DBMixin):

    def __init__(self, key, db_dir=DB_DIRECTORY, db=None *args, **kwargs):
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
        return super(RefreshDict).__getitem__(self, key)


class User(object, DBMixin):

    TAXA_KEY = "taxa"
    DIET_KEY = "diet"
    PCOA_KEY = "pcoa"

    def __init__(self, pid, db=None, db_dir=DB_DIRECTORY):
        self.pid = pid
        self._db = db
        self.state = RefreshDict(pid, db=db)

    def save(self):
        return self.db.Put(str(self.pid), serialize(self.state))

    @staticmethod
    def raw(pid, db=None, db_dir=DB_DIRECTORY):
        if db is None:
            db = initialize_db(db_dir)
        return db.Get(pid)
