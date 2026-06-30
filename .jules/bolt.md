## 2024-05-18 - Optimized `renderStreaks` and `renderTopBarStats` loops in `js/ui.js`
**Learning:** Found an O(N^2) complexity bottleneck inside `renderStreaks` and `renderTopBarStats` inner 30/365-day iteration loops due to consecutive usages of `state.routines.some(r => r.id === id)` within array filters. The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops.
**Action:** Always map active state IDs into O(1) `Set` objects (`new Set(state.routines.map(r => r.id))`) beforehand to prevent UI thread blocking from repeated O(N) array loops.
