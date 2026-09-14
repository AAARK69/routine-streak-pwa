## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-20 - Memoizing HTML templates and bitmasks
**Learning:** The application renders a 365-day grid and frequently re-calculates state arrays (`.includes`) and inline HTML strings (`+=`). Doing this inside deep loops causes noticeable rendering delays.
**Action:** Pre-calculate logical state matching into integer bitmasks (e.g. `(mask & (1 << dow)) !== 0`) and pre-assemble HTML substring chunks (e.g., `htmlPrefix` and `htmlSuffix`) before iterating to eliminate array method and string instantiation overhead in hot loops.
