## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Precompute Template Strings and Avoid Date Allocations in Rendering Loops
**Learning:** In large rendering loops (like a 365-day calendar grid mapping 10+ routines), repeatedly evaluating template literals (e.g. `\`<span class="\${status}"></span>\``) and instantiating `new Date()` objects for date comparisons causes high overhead and garbage collection pressure.
**Action:** When rendering large recurring grids, precompute possible HTML string chunks outside the loop into a cache array. Replace local `Date` instantiations with simple lexicographical local string comparisons (`YYYY-MM-DD` strings) and use bitwise masks (`1 << currentDow`) to check scheduled days.
