###
# Config

debug = False
map_file = "./input/map.txt"
diet_data = "./input/diet.txt"
products_dir = "products"
database_dir = "/local/ibdmdb/hmp2-visualizations/leveldb"

class web:
    host = "127.0.0.1"
    port = "8765"
    #prefix_url = "/patient" #no prefix by default
    prefix_url = "/participant" #no prefix by default
    static_url_base = "https://ibdmdb.org/static/"
