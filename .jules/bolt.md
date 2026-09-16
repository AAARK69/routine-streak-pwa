## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2026-09-16 - Date Instantiation Inside Render Loops
**Learning:** In the `routine-streak-pwa` codebase, rendering large 365-day UI grids (like `renderYearGrid`) originally initialized `new Date()` objects for every single cell iteration just to calculate the day of the week and check if the date was in the future.
**Action:** Replace dynamic `Date` instantiation inside long calendar loops with manual zero-indexed string tracking (e.g. `const todayStr = '2026-09-16'`) and integer modulo math for days of the week (`dow = (dow + 1) % 7`), saving significant memory allocation and garbage collection pressure in V8.
