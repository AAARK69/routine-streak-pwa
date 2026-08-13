## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Combine separate loops over identical datasets
**Learning:** When multiple separate loops iterate over the exact same date ranges to calculate different visual blocks (e.g. heatmap grids and average statistics), they can and should be combined. Iterating over the same ranges multiple times introduces O(N) penalties and repeated string generation/parsing.
**Action:** Always combine loops iterating over the same fixed ranges (like days or months) and update multiple separate data structures simultaneously within a single pass.
