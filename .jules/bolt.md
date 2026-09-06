## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-15 - Combine redundant loops over identical date ranges
**Learning:** In `js/ui.js` inside `renderStreaks`, there were two identical consecutive loops iterating over the past 30 days to calculate the yield percentage and then construct the heatmap grid. Iterating over the exact same date math twice is redundant. Furthermore, they both employed `O(N)` `.filter()` calls inside the loop.
**Action:** Always combine consecutive identical loops into a single loop to eliminate repetitive setup operations (like `new Date()`). Pre-compute array mapping logic (like `routineCountsByDay`) *outside* the loop to avoid intermediate array allocation on every iteration.
