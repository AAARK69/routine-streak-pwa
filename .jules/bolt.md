## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.

## 2024-05-20 - Memoize expensive function calls before sort
**Learning:** When sorting arrays using expensive function calls in comparators (e.g., `calculateStreak` in `js/ui.js`), memoizing the results in a `Map` *before* the `.sort()` call using a separate `.forEach()` loop provides measurable performance improvements. Do not lazily populate the cache inside the sort comparator, as the comparator is never executed if the array length is 0 or 1, leaving the cache empty and causing subsequent lookups to crash the app.
**Action:** Memoize expensive comparators using a `Map` and a separate `.forEach` loop *before* running `.sort()`.

## 2024-06-01 - Avoid Array Filtering in Loops
**Learning:** Avoid O(N) array filtering (e.g., `.filter(r => r.days.includes(day))`) inside deep rendering loops. Pre-calculating these relationships into simple lookup arrays before the outer loops significantly reduces computational complexity and execution time.
**Action:** Pre-compute array filters into lookups for tight loops.

## 2024-06-15 - Early break Array Allocation
**Learning:** In the backward-looking streak calculator `globalStreak` calculation inside `renderTopBarStats`, using `.filter(r => ...)` inside the loop creates hundreds of arrays every render, degrading performance. We can avoid O(N) array allocations by replacing them with simple `for` loops that use early `break` statements. This cuts down execution time by nearly 50% since we only need to know if an element exists, not allocate a new array for it.
**Action:** When only checking if any element matches a condition inside an outer loop, use a `for` loop with a `break` instead of `.filter().length > 0` to prevent redundant full traversals and array allocations.
