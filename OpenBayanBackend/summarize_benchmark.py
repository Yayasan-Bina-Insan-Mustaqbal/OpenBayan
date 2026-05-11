import json
from collections import defaultdict

try:
    with open("storm_benchmark_results.json") as f:
        data = json.load(f)

    stats = defaultdict(lambda: {"total": 0, "success": 0, "duration": 0.0})

    for row in data:
        key = f"{row.get('model')} | {row.get('strategy')}"
        stats[key]["total"] += 1
        if row.get("success"):
            stats[key]["success"] += 1
            stats[key]["duration"] += row.get("duration_seconds", 0)

    print(f"{'Model | Strategy':<40} | {'Success':<10} | {'Avg Time (s)'}")
    print("-" * 70)
    for k, v in stats.items():
        success_rate = f"{v['success']}/{v['total']}"
        avg_time = v["duration"] / v["success"] if v["success"] > 0 else 0
        print(f"{k:<40} | {success_rate:<10} | {avg_time:.2f}")

except Exception as e:
    print(f"Error reading results: {e}")
