## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-24 - Pre-calculate relationships to avoid O(N) filtering in nested loops
**Learning:** O(N) array filtering (e.g., `state.routines.filter(r => r.days.includes(dayOfWeek))`) inside deep rendering loops (like iterating over the last 30 days) significantly degrades performance. Furthermore, iterating over the same date range multiple times duplicates expensive overhead (Date creation, array filtering).
**Action:** When multiple separate loops iterate over the same range, combine them. Pre-calculate invariant array relationships (like routines scheduled per day of the week) into a simple lookup array `scheduledByDay` *before* entering the outer loop to achieve O(1) lookups inside the hot path.
