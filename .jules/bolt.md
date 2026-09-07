## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-18 - Safe Math.sin Memoization
**Learning:** When memoizing continuous mathematical functions (like circadian energy curve `Math.sin` calculations based on `hour`) into discrete lookup tables (e.g. `Float32Array`), do not blindly cast inputs to integers if the function receives fractional values. Ensure you maintain necessary precision by scaling indices (e.g., `Math.round(hour * PRECISION)`) and handle array bounds with modulo wrap-around logic so it does not break continuous logic.
**Action:** Use precision scaling and modulo boundary checking when memoizing continuous heuristic formulas into arrays.
