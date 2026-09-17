## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-14 - Memoize Math.sin calculations in tight loops
**Learning:** In hot computational paths like the genetic algorithm scheduler, repeated evaluation of `Math.sin` for continuous functions like `getEnergyCapacity` becomes a significant bottleneck, causing it to take >2 seconds for 50 evaluations.
**Action:** Memoize static, bounded calculations into pre-allocated typed arrays (e.g., `Float32Array`). Ensure proper index handling (like `Math.floor` and modulo wrap-around logic) is maintained so memory bounds errors do not occur.
