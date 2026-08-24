## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-15 - Genetic Algorithm CPU Loops
**Learning:** `Math.max()` and `Math.min()` induce measurable overhead inside highly iterative loops (like the Genetic Algorithm in `scheduler.js` processing overlaps millions of times). Pre-allocating `Array.from()` mappings using `new Array(size)` combined with a standard `for` loop also provides significant GC and speed benefits. Plain objects `{}` fall into dictionary mode under intense read/write loads; `new Map()` provides much faster performance for string-key caches.
**Action:** Replace `Math.max/min` with inline ternary conditionals in computationally hot paths, explicitly pre-allocate arrays, and use `Map` for high-frequency caches.
