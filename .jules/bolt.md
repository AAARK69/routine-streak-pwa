## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-14 - Combine Redundant Loops Iterating the Same Scope
**Learning:** The application had two identical sequential loops iterating 31 times backward from today: one to calculate `totalScheduledSlots` and `totalCompletedSlots` for the yield percentage, and a second to render the `heatmapFragment`. This redundant setup caused duplicate O(N) filtering of arrays and repeated `new Date()` object instantiation.
**Action:** When multiple loops map over exactly the same range or data slice (especially involving expensive Date logic or O(N) filtering), combine them into a single loop execution step to save overhead.
