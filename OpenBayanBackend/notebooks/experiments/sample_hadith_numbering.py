import os
import re
import json
import requests
from typing import List, Dict, Any

# Connection Details
SURREAL_URL = os.getenv("SURREALDB_URL", "http://192.168.100.33:8000/sql")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

SURREAL_AUTH = (SURREAL_USER, SURREAL_PASS)
SURREAL_HEADERS = {
    "surreal-ns": SURREAL_NS,
    "surreal-db": SURREAL_DB,
    "Accept": "application/json",
    "Content-Type": "text/plain"
}

def execute_sql(sql: str) -> List[Dict[str, Any]]:
    try:
        res = requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=sql.encode('utf-8'), timeout=60)
        if res.status_code != 200:
            print(f"Error executing SQL: {res.text}")
            return []
        return res.json()
    except Exception as e:
        print(f"Connection error: {e}")
        return []

def main():
    print("Bismillah. Starting Hadith Numbering Exploration Script...")
    
    # 1. Get all unique collections
    print("Fetching unique hadith collections from database...")
    coll_query = "SELECT collection, count() AS count FROM hadith GROUP BY collection;"
    coll_results = execute_sql(coll_query)
    
    if not coll_results or not coll_results[0].get('result'):
        print("Error: Could not retrieve hadith collections from SurrealDB.")
        return
        
    collections_data = coll_results[0]['result']
    print(f"Found {len(collections_data)} unique collections.")
    
    # Get total hadiths
    total_db_hadiths = sum(c.get('count', 0) for c in collections_data)
    print(f"Total hadiths across all collections: {total_db_hadiths}")
    
    report_lines = []
    report_lines.append("# Hadith Numbering Analysis Report")
    report_lines.append("")
    report_lines.append("This report analyzes the structure and formatting of `hadith_number` across all collections in the SurrealDB `hadith` table.")
    report_lines.append("")
    report_lines.append(f"- **Total Unique Collections**: {len(collections_data)}")
    report_lines.append(f"- **Total Hadith Records**: {total_db_hadiths}")
    report_lines.append("")
    report_lines.append("## 1. Summary Statistics Table")
    report_lines.append("")
    report_lines.append("| Collection | Total Hadiths | Numbered Hadiths | Numbered % | Non-Numeric Count | Numeric Sample | Non-Numeric Sample |")
    report_lines.append("|------------|---------------|------------------|------------|-------------------|----------------|--------------------|")
    
    detailed_sections = []
    detailed_sections.append("## 2. Detailed Collection Analysis")
    detailed_sections.append("")
    
    for coll_info in sorted(collections_data, key=lambda x: x.get('collection', '')):
        coll_name = coll_info.get('collection')
        total_hadiths = coll_info.get('count', 0)
        
        if not coll_name:
            continue
            
        print(f"Analyzing collection: {coll_name} ({total_hadiths} hadiths)...")
        
        # Count numbered hadiths with GROUP BY
        numbered_query = (
            f"SELECT collection, count() AS count FROM hadith "
            f"WHERE collection = '{coll_name}' AND hadith_number != NONE AND hadith_number != '' GROUP BY collection;"
        )
        numbered_res = execute_sql(numbered_query)
        numbered_count = 0
        if numbered_res and numbered_res[0].get('result'):
            result_list = numbered_res[0]['result']
            if result_list:
                numbered_count = result_list[0].get('count', 0)
            
        # Count non-numeric hadiths
        non_numeric_query = (
            f"SELECT collection, count() AS count FROM hadith "
            f"WHERE collection = '{coll_name}' AND hadith_number != NONE AND hadith_number != '' "
            f"AND string::is_numeric(hadith_number) = false GROUP BY collection;"
        )
        non_numeric_res = execute_sql(non_numeric_query)
        non_numeric_count = 0
        if non_numeric_res and non_numeric_res[0].get('result'):
            result_list = non_numeric_res[0]['result']
            if result_list:
                non_numeric_count = result_list[0].get('count', 0)
                
        # Get sample of numeric hadith numbers
        numeric_sample_query = (
            f"SELECT hadith_number FROM hadith "
            f"WHERE collection = '{coll_name}' AND hadith_number != NONE AND hadith_number != '' "
            f"AND string::is_numeric(hadith_number) = true LIMIT 10;"
        )
        numeric_sample_res = execute_sql(numeric_sample_query)
        numeric_numbers = []
        if numeric_sample_res and numeric_sample_res[0].get('result'):
            numeric_numbers = [r.get('hadith_number', '') for r in numeric_sample_res[0]['result'] if r.get('hadith_number')]
            
        # Get sample of non-numeric hadith numbers
        non_numeric_sample_query = (
            f"SELECT hadith_number FROM hadith "
            f"WHERE collection = '{coll_name}' AND hadith_number != NONE AND hadith_number != '' "
            f"AND string::is_numeric(hadith_number) = false LIMIT 10;"
        )
        non_numeric_sample_res = execute_sql(non_numeric_sample_query)
        non_numeric_numbers = []
        if non_numeric_sample_res and non_numeric_sample_res[0].get('result'):
            non_numeric_numbers = [r.get('hadith_number', '') for r in non_numeric_sample_res[0]['result'] if r.get('hadith_number')]
            
        # Format samples for the table
        numeric_sample_str = ", ".join(sorted(list(set(numeric_numbers)), key=lambda x: int(x) if x.isdigit() else 999999)[:5]) if numeric_numbers else "None"
        non_numeric_sample_str = ", ".join(list(set(non_numeric_numbers))[:5]) if non_numeric_numbers else "None"
        
        pct_numbered = (numbered_count / total_hadiths * 100) if total_hadiths > 0 else 0
        
        report_lines.append(
            f"| `{coll_name}` | {total_hadiths} | {numbered_count} | {pct_numbered:.1f}% | {non_numeric_count} | `{numeric_sample_str}` | `{non_numeric_sample_str}` |"
        )
        
        # Build detailed section
        detailed_sections.append(f"### Collection: `{coll_name}`")
        detailed_sections.append(f"- **Total Records**: {total_hadiths}")
        detailed_sections.append(f"- **Numbered Records**: {numbered_count} ({pct_numbered:.1f}%)")
        if numeric_numbers:
            detailed_sections.append(f"- **Numeric Samples**: `{', '.join(numeric_numbers[:10])}`")
        if non_numeric_numbers:
            detailed_sections.append(f"- **Non-Numeric Samples**: `{', '.join(non_numeric_numbers[:10])}`")
        detailed_sections.append("")
        
    full_report = "\n".join(report_lines) + "\n\n" + "\n".join(detailed_sections)
    
    # Save the report in the experiments folder of the project directory
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hadith_numbering_report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(full_report)
        
    print(f"Alhamdulillah! Analysis complete. Report saved to: {report_path}")

if __name__ == "__main__":
    main()
