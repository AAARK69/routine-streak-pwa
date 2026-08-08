## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-24 - Combine Date Loops and Avoid Array Filtering
**Learning:** When multiple separate loops iterate over the same date range (e.g., in `renderStreaks`), combining them eliminates redundant setup costs like `Date` object instantiation, string parsing, and repeated O(N) array filtering. Pre-calculating relationships into simple lookup arrays before the outer loops significantly reduces computational complexity.
**Action:** Always combine loops iterating over the same date range and pre-calculate relationships before entering the loop.
