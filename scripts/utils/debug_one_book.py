import requests, json
SURREAL_URL = 'http://192.168.100.33:8000/sql'
SURREAL_AUTH = ('root', 'RwAbXjBc2z36z')
SURREAL_HEADERS = {'surreal-ns': 'openbayan', 'surreal-db': 'openbayan', 'Accept': 'application/json'}

identifier = 'shamela_الإعتصام_بالإسلام__العرباوي_عمر_العرباوي'
title = 'الإعتصام بالإسلام - العرباوي'
author = 'عمر العرباوي'
category = 'فهارس الكتب والأدلة'
params = {'pages': 0, 'volumes': 0}
pdf_paths = []
txt_paths = []
docx_paths = []
root_source_id = 'source:shamela_waqfeya'

source_id = f'source:`{identifier}`'
book_id = f'book:`{identifier}`'

sql = f"UPSERT {source_id} SET "
sql += f"identifier = {json.dumps(identifier)}, "
sql += f"title = {json.dumps(title)}, "
sql += f"author = {json.dumps(author)}, "
sql += f"type = 'book', "
sql += f"language = 'ar', "
sql += f"metadata = {json.dumps({'category': category, 'pages': params['pages'], 'volumes': params['volumes']})}, "
sql += f"file_paths = {json.dumps({'pdf': pdf_paths, 'txt': txt_paths, 'docx': docx_paths})}; "

sql += f"UPSERT {book_id} SET "
sql += f"title = {json.dumps(title)}, "
sql += f"author = {json.dumps(author)}, "
sql += f"category = {json.dumps(category)}, "
sql += f"source = {source_id}, "
sql += f"extra_metadata = {json.dumps({'shamela_id': identifier, 'root_source': root_source_id})};"

print(f'Running SQL: {sql[:100]}...')
resp = requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=sql.encode('utf-8'))
print(resp.json())
