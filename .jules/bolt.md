## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Optimize GA fitness function
**Learning:** In hot computational paths (like a genetic algorithm), repeated execution of expensive trigonometric functions (like `Math.sin`) in a fitness evaluator can be a significant bottleneck. Memoizing these into a pre-allocated typed array (`Float32Array`) yields massive performance gains.
**Action:** Use typed arrays to memoize static, bounded calculations in tight algorithmic loops.
