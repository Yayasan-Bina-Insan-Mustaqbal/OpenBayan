import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from atomize_hadith_v5 import execute_sql, strip_tashkeel, get_embedding, get_matn_boundary
import json

res = execute_sql("SELECT * FROM hadith LIMIT 1")
hadith = res[0]["result"][0]
hid_raw = str(hadith["id"])
hid_inner = "18_1"
source_id = "source:hadith_650k_sanadset"
matn_part = hadith["matn_ar"]

boundary_idx = get_matn_boundary(matn_part)
isnad_part = matn_part[:boundary_idx]
matn_part = matn_part[boundary_idx:]

sentences = [matn_part.strip()]
upsert_queries = ["BEGIN TRANSACTION;"]

for idx, segment in enumerate(sentences):
    clean_segment = strip_tashkeel(segment)
    embedding = get_embedding(clean_segment)
    sent_id = f"sentence:⟨hadith_{hid_inner}_s{idx}⟩"
    safe_text = segment.replace("'", "\\'")
    safe_clean = clean_segment.replace("'", "\\'")
    q = f"""
        UPSERT {sent_id} SET
            text = '{safe_text}',
            simple_clean_text = '{safe_clean}',
            embedding = {json.dumps(embedding)},
            parent = {hid_raw},
            source = {source_id},
            chunk_index = {idx},
            transliterations = {{ en: "", ru: "", tr: "" }},
            created_at = time::now();
    """
    upsert_queries.append(q)

upsert_queries.append("COMMIT TRANSACTION;")
sql = "\n".join(upsert_queries)
print("EXECUTE SQL:")
print(sql)
print("RESPONSE:")
response = execute_sql(sql)
print(json.dumps(response, indent=2))
