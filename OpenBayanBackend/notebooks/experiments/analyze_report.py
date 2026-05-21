import re

with open('/home/abuhafi/Project/IslamResearch/OpenBayan/OpenBayanBackend/notebooks/experiments/hadith_numbering_report.md', 'r') as f:
    lines = f.readlines()

# Join wrapped lines (those that start with space or continuation of table)
joined_lines = []
current = ''
for line in lines:
    line = line.rstrip('\n')
    if current and line and not line.startswith('|') and not line.startswith('#') and not line.startswith('-') and not line.startswith('\n'):
        current = current + line
    else:
        if current:
            joined_lines.append(current)
        current = line
if current:
    joined_lines.append(current)

table_lines = [l for l in joined_lines if l.startswith('|') and 'Collection' not in l and '---' not in l]

print(f"Table lines found: {len(table_lines)}")
if table_lines:
    print(f"Sample: {table_lines[0][:200]}")

total_collections = 0
fully_numbered = 0
partially_numbered = 0
zero_numbered = 0
total_records = 0
total_numbered = 0
top_by_size = []

for line in table_lines:
    # normalize pipe fields
    parts = [p.strip() for p in line.split('|')]
    # filter empty start/end
    parts = [p for p in parts if p or parts.index(p) not in (0, len(parts)-1)]
    if len(parts) < 5:
        continue
    try:
        name = parts[0].strip('` ')
        total = int(parts[1])
        numbered = int(parts[2])
        pct_str = parts[3].replace('%', '').strip()
        pct = float(pct_str)
        numeric_sample = parts[5].strip('` ') if len(parts) > 5 else ''

        total_collections += 1
        total_records += total
        total_numbered += numbered

        if pct == 100.0:
            fully_numbered += 1
        elif pct == 0.0:
            zero_numbered += 1
        else:
            partially_numbered += 1

        top_by_size.append((total, name, numbered, pct, numeric_sample))
    except Exception as e:
        pass

top_by_size.sort(reverse=True)

print(f'\n=== SUMMARY ===')
print(f'Total unique collections: {total_collections}')
print(f'Fully numbered (100%): {fully_numbered}')
print(f'Partially numbered: {partially_numbered}')
print(f'Zero numbered (0%): {zero_numbered}')
print(f'Total records: {total_records:,}')
print(f'Total numbered: {total_numbered:,}')
if total_records:
    print(f'Overall numbering coverage: {total_numbered/total_records*100:.2f}%')

print()
print('=== TOP 20 COLLECTIONS BY SIZE ===')
for total, name, numbered, pct, sample in top_by_size[:20]:
    print(f'  {name}: {total:,} hadiths ({pct:.1f}%)')
