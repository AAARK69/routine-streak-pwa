## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Map routines by day in O(1) instead of O(N) filter
**Learning:** In the `ui.js` rendering loops, querying arrays with `.filter()` multiple times per loop iteration for constant values like `r.days.includes(dayOfWeek)` causes significant overhead. Consolidating identical rendering loops (like the dual 30-day loops in `renderStreaks`) and pre-calculating the active objects into day-indexed arrays drops the time complexity from O(Days * Routines) to O(Days).
**Action:** When iterating over dates in UI generation, pre-calculate the active datasets for the 7 days of the week into an `Array.from({length: 7})` cache before entering the time loops.
