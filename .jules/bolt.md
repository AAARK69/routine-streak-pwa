## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-15 - Pre-calculating UI conditions before deep loops
**Learning:** Avoid O(N) array filtering (e.g., `.filter(r => r.days.includes(day))`) inside deep rendering loops like iterating over 30-day or 365-day grids. Re-evaluating the same conditions repeatedly scales poorly.
**Action:** Always map these invariant properties into simple lookup arrays (like O(1) day-of-week counters) *before* the outer loops to significantly reduce computational complexity and execution time.
