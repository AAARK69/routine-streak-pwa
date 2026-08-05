## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Timezone Regression during loop optimization
**Learning:** `toISOString()` returns the absolute UTC time, whereas `getFullYear()`/`getDate()` return the user's Local time. Blindly optimizing `toISOString().split('T')[0]` to `date.getFullYear() + '-' + ...` introduces a severe timezone mismatch that breaks date-key lookups for completions globally for several hours per day.
**Action:** Always maintain the exact time-boundary behavior of the original codebase when optimizing date operations. If original uses `toISOString()`, you must maintain UTC logic (e.g. `getUTCFullYear()` or `toISOString().substring(0, 10)`).
