## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-14 - Combine redundant Date and Array operations in renderStreaks
**Learning:** `renderStreaks` contained two separate loops iterating backward 30 days, both doing `new Date()` and array filtering. This resulted in O(N) filtering running twice for the exact same condition.
**Action:** Always combine loops that iterate over the same date range when they share the same setup cost (like Date object instantiation and filtering).
