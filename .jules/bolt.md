## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Memoize Array Sort Comparators
**Learning:** The `renderStreaks` method sorts routines based on computed streaks using an expensive `calculateStreak` function which sweeps backward across completion dates. Since the comparator is called O(N log N) times, not caching this value leads to severe redundant computations and freezes on larger accounts.
**Action:** Always memoize computationally expensive results before passing them into `Array.prototype.sort()`.
