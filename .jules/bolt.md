## 2026-06-21 - [O(n^2) nested loop optimized to O(1) hash map lookup]
**Learning:** Found repetitive array search loops inside nested array lookups for finding completed tasks for top bar stats and heatmap generation.
**Action:** Replace nested loops by pre-computing a lookup Set to check routine IDs. Consolidate redundant sequential loops doing the same iteration tasks.
