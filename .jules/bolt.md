## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2026-07-21 - Do not lazily populate cache in Array.prototype.sort
**Learning:** When attempting to memoize expensive function calls (like `calculateStreak`) for array sorting, lazily populating the `Map` cache inside the `.sort()` comparator creates a critical regression. If the array length is 0 or 1, the `Array.prototype.sort()` comparator is never invoked, meaning the cache is never populated. Any subsequent loops relying on that cache will attempt to destructure `undefined` and crash the application.
**Action:** Always pre-populate the cache using an explicit `.forEach()` loop over the array *before* initiating the `.sort()` operation to guarantee all elements are safely cached regardless of array length.
