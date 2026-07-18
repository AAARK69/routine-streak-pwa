## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Memoizing expensive function calls in sorts
**Learning:** The application heavily relies on sorting arrays using the `calculateStreak` function in `js/ui.js` which is quite slow as it sweeps large completion structures. This leads to massive performance bottlenecks as the sorting uses O(N log N) logic, recalculating it repeatedly for the same items.
**Action:** When a sort comparator uses an expensive function, always iterate over the objects beforehand to cache the function's value for each object inside a `Map`. Then retrieve the value from the `Map` in the comparator.
