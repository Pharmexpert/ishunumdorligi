import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('excel_analysis.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

output = open('structure_summary.txt', 'w', encoding='utf-8')

for fname, info in d.items():
    if 'error' in info:
        output.write(f"\n{fname}: ERROR - {info['error']}\n")
        continue
    output.write(f"\n{'='*60}\n")
    output.write(f"FILE: {fname}\n")
    output.write(f"Sheets: {info['sheets']}\n")
    for sn, det in info['details'].items():
        output.write(f"\n  Sheet: [{sn}] rows={det['max_row']}, cols={det['max_col']}, merged={len(det['merged_cells'])}\n")
        if det['data']:
            for i, row in enumerate(det['data'][:5]):
                vals = [c['val'] for c in row]
                output.write(f"    Row {i+1}: {vals[:15]}\n")

output.close()
print("Done")
