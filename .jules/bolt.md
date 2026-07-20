## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Memoize calculations in sort comparators
**Learning:** When sorting arrays using expensive function calls in comparators (e.g., `calculateStreak` in `js/ui.js`), it results in O(N log N) evaluations which is extremely inefficient.
**Action:** Memoize the results of expensive calculations in a `Map` beforehand to prevent O(N log N) re-evaluations and keep the calls to O(N).
