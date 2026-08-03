## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-18 - Fast string parsing and integer ms iteration for Dates
**Learning:** In deep loops, avoiding allocating new `Date()` objects or generating `.toISOString()` strings per iteration avoids large memory and GC overhead. Parsing strict date strings using character math (`charCodeAt`) to derive UTC timestamps and iterating milliseconds prevents significant blocking. Replacing array `.includes()` with pre-calculated integer bitmasks for schedule checking also yields measurable performance improvements.
**Action:** When working in hot computational paths, particularly scheduling iterations, parse exact dates to UTC milliseconds and increment by `86400000`, using integer bitmasks instead of array methods.
