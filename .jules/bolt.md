## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-15 - Fast Pre-calculated Lookup Arrays Replace Filter Overheads
**Learning:** O(N) functional loops like `array.filter(condition).length` nested inside daily evaluation loops cause massive slowdowns during global streak and heatmap calculations.
**Action:** When evaluating routine statuses over backward timeframes, pre-calculate schedule data (like `routinesByDay` counts) and use simple loops with `break` directly inside the loop instead of mapping and filtering over complete arrays repetitively.
