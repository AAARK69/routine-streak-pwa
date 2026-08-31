## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2026-08-31 - Combine loops and avoid array allocations inside deep loops
**Learning:** In the `renderStreaks` function, it was observed that the exact same 31-day loop was executed twice consecutively—once to count scheduled vs completed slots, and again to render the heatmap grid. Also, using `Array.prototype.filter().length` in tight loops repeatedly created and garbage-collected intermediate arrays unnecessarily.
**Action:** Always inspect subsequent loops in rendering functions to see if they iterate over the same data. Combine them where possible. Replace `array.filter().length` with simple counters in a `for` loop to save memory allocation overhead.
