## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-15 - Array sorting memoization
**Learning:** When sorting arrays using custom comparators that involve expensive function calls (e.g., `calculateStreak` in `js/ui.js`), those functions are evaluated repeatedly (O(N log N)).
**Action:** Always pre-calculate and memoize the results of expensive functions into a `Map` prior to running `sort()` on the array to ensure O(N) evaluation.
