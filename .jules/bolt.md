## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-06-21 - Merge duplicate date iterations
**Learning:** Separate loops iterating over identical date ranges in the same UI function (`renderStreaks`) redundant object allocations and filters. Merging loops calculating stats and constructing the DOM cut execution time significantly by halving `Date` instantiations and array `.filter()` overhead.
**Action:** Always check if adjacent logic blocks iterate over the same data/range, and combine them to save O(N) setup overhead.