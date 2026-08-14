## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2026-08-14 - Optimize JSDOM global mock setup
**Learning:** When using `jsdom` to benchmark frontend rendering code that reads `localStorage`, executing scripts without setting an explicit base URL triggers a `DOMException [SecurityError]: localStorage is not available for opaque origins`.
**Action:** When initializing JSDOM for testing, always pass `{ url: 'http://localhost' }` to explicitly provide a valid origin, allowing `global.localStorage = dom.window.localStorage;` to mount cleanly without security exceptions.
