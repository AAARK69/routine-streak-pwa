## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-08-07 - Combine Redundant Loops for O(N) Reductions
**Learning:** When multiple separate loops iterate over the exact same date range (e.g., rendering daily UI elements and calculating yield stats sequentially), combining them into a single loop halves the overhead. This eliminates redundant setup costs like `Date` object instantiation, string parsing, and repeated O(N) array filtering.
**Action:** Always check if subsequent loops operating on the same iterations/data can be merged to eliminate duplicate processing.
