## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-15 - Pre-calculate routine schedules in year calendar
**Learning:** In the 12-month calendar rendering loop (365 iterations), checking if a routine is active on a specific day of the week using `rt.days.includes(dow)` inside an inner loop causes significant array iteration overhead. Pre-calculating a boolean cache array (O(1) lookup) for both routine day mapping and general `hasRoutinesOnDay` prevents O(N) array filtering/includes calls in the hot render path.
**Action:** When mapping relationships in tight UI loops, pre-calculate relationships into simple lookup arrays before the outer loop.
