## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-18 - Replacing Deep Loop Filters with Pre-Calculations
**Learning:** In routine processing paths (e.g. `renderTopBarStats` calculating global streak backward), repeatedly executing O(N) array methods like `.filter()` across arrays generated inside the loop is a major performance bottleneck due to intermediate object allocation and redundant iteration.
**Action:** When evaluating active states in deep UI logic or scheduling loops, pre-calculate relationships (like active routines by day of week) outside the loop into a simple lookup array. Additionally, replace intermediate array filtering `.filter(cond).length > 0` inside hot loops with traditional `for` counting loops to prevent continuous array allocations and reduce GC pressure.
