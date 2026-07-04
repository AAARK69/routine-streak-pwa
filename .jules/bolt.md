## 2024-03-24 - [Optimize deep loop lookups]
**Learning:** In deeply nested rendering loops like in `renderStreaks` or `renderTopBarStats`, using `.some` array methods inside a loop (especially for 365 days lookup) significantly degrades performance due to O(N) operations.
**Action:** Always map objects to O(1) `Set` instances before evaluating active states in loops that run frequently in the UI thread.
