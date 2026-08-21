## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-15 - Combine Date parsing and filter loops
**Learning:** In `js/ui.js`'s `renderStreaks`, separate logic blocks were iterating over the identical past 30 days twice: once to calculate metrics and once to build the UI DOM. This forced the V8 engine to redundantly instantiate new `Date` objects, parse string conversions, and repeat O(N) array `.filter()` loops twice over the exact same conditions per render cycle.
**Action:** When multiple separate loops iterate over the same date range, combining them into a single loop eliminates redundant setup costs and avoids repeating O(N) filtering operations.
