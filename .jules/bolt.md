## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-15 - Memoize expensive function calls before Array.prototype.sort
**Learning:** When sorting arrays using expensive function calls in comparators (e.g., `calculateStreak` in `js/ui.js`), memoize the results in a `Map` *before* the `.sort()` call using a separate `.forEach()` loop. Do not lazily populate the cache inside the sort comparator, as the comparator is never executed if the array length is 0 or 1, leaving the cache empty and causing subsequent lookups in rendering loops to crash the app.
**Action:** Always pre-calculate and cache expensive operations via `.forEach` map-building before invoking `.sort()`, converting O(N log N) comparator calls to O(1) lookups.
