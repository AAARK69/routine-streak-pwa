## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-14 - Replace Date string conversions in tight loops
**Learning:** Calling `.toISOString()` strings dynamically inside of a tight `while` loop slows execution significantly due to object instantiation and internal date string manipulation over 1000s of iterations.
**Action:** Always parse ISO date strings to UTC integers beforehand with `charCodeAt` when mapping arrays of date strings and doing interval-based calendar arithmetic rather than instantiating dynamic date strings in hot code loops. Calculate scheduled day matches using bitmasking instead of `.includes()`.
