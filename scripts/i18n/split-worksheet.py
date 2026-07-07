#!/usr/bin/env python3
"""Split each language worksheet into 2 balanced parts (by sorted key order)."""
import json, os

WORK_DIR = ".tmp/worksheets"
TARGETS = ["es", "de", "it", "pt", "nl"]

for loc in TARGETS:
    with open(f"{WORK_DIR}/{loc}.json", encoding="utf-8") as f:
        d = json.load(f)
    keys = sorted(d.keys())
    mid = len(keys) // 2
    part1 = {k: d[k] for k in keys[:mid]}
    part2 = {k: d[k] for k in keys[mid:]}
    with open(f"{WORK_DIR}/{loc}-part1.json", "w", encoding="utf-8") as f:
        json.dump(part1, f, ensure_ascii=False, indent=2)
    with open(f"{WORK_DIR}/{loc}-part2.json", "w", encoding="utf-8") as f:
        json.dump(part2, f, ensure_ascii=False, indent=2)
    print(f"{loc}: part1={len(part1)} part2={len(part2)}")
print("Split done.")
