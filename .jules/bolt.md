## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Memoize expensive function calls in sort comparators
**Learning:** The `renderStreaks` function was re-evaluating the expensive `calculateStreak` function multiple times for the same routine during the `O(N log N)` `sort` operation. This caused massive performance degradation as the array size grew.
**Action:** Always pre-calculate expensive operations that depend only on the array element and not on the comparison itself, storing the results in a `Map` prior to calling `.sort()`.
