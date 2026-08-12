## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2023-10-27 - Single Loops
**Learning:** When multiple separate loops iterate over the same date range (e.g., rendering daily UI elements and calculating stats), combine them into a single loop. This eliminates redundant setup costs like Date object instantiation, string parsing, and repeated O(N) array filtering for the same conditions.
**Action:** Always combine loops iterating over the same datasets or ranges when possible.
