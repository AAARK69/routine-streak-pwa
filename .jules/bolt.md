## 2024-05-14 - Replace O(N) Arrays operations with O(1) Set Lookups in UI Rendering
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops in `js/ui.js` (e.g., `renderStreaks`, `renderTopBarStats`). Using `Array.some` or `Array.includes` inside these deep loops blocks the UI thread.
**Action:** When evaluating active states inside these deep loops, always map arrays into O(1) `Set` objects beforehand to prevent UI thread blocking from repeating O(N) array methods.
