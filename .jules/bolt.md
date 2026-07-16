## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-24 - Array sort with expensive comparators
**Learning:** In UI rendering code, especially during sorting loops, repeating expensive functions like `calculateStreak` within the `sort` comparator scales poorly (O(N log N) evaluations).
**Action:** Always memoize the results of expensive evaluations in a Map or Array prior to the sorting step.
