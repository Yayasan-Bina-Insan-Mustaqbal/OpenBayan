from surrealdb import Surreal

db = Surreal("ws://192.168.100.33:8000/rpc")
db.signin({"user": "root", "pass": "RwAbXjBc2z36z"})
db.use("openbayan", "openbayan")
# Aggregate count results
res = db.query("SELECT math::sum(count()) AS count FROM ayah GROUP ALL; SELECT math::sum(count()) AS count FROM lisan_page GROUP ALL; SELECT math::sum(count()) AS count FROM maqayis_page GROUP ALL;")
print(f"Quran: {res[0]['result'][0]['count']}")
print(f"Lisan: {res[1]['result'][0]['count']}")
print(f"Maqayis: {res[2]['result'][0]['count']}")
db.close()
