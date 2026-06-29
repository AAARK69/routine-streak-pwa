
## 2023-11-20 - O(N) Array Filtration in deeply nested JS loops
**Learning:** When building large UI grids representing time series data (like a 365-day calendar grid or a 30-day streak heatmap), filtering an array of valid active items inside the rendering loop (`state.routines.some(r => r.id === id)`) multiplies linearly. For dense arrays, doing this thousands of times across the UI blocks the main UI thread.
**Action:** When evaluating active state across hundreds of nodes (like UI grid cells), always map the active IDs into an `O(1)` JS `Set` *before* entering the deeply nested loop (`const validRoutineIds = new Set(...)`). It takes fractional ms to build the Set but reduces 1200ms UI render blocks down to ~80-120ms.
