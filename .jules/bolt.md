## 2024-05-14 - Map arrays to Set in deep loops
**Learning:** The application heavily iterates over `state.routines` and `state.completions` during UI rendering loops. When evaluating active states inside these deep loops, always mapping arrays into O(1) `Set` objects beforehand prevents UI thread blocking from repeating O(N) array methods.
**Action:** Always create `Set` objects for lookups in tight loops, particularly for `id` filtering.
## 2024-05-15 - Map `.includes()` on small arrays to `.has()` Set lookups
**Learning:** For small arrays like `rt.days` (which has at most 7 elements, 0-6), creating and querying a `Set` via `routineDaysMap.get(rt.id).has(dow)` is actually slower than simply keeping `rt.days` as an array and using `rt.days.includes(dow)`. The overhead of `Map` lookups and `Set` hashing inside a deep loop (~365 iterations * 50 routines) outweighs the `O(N)` vs `O(1)` theoretical difference when N is so small. This was measured as a regression (from ~890ms to ~1023ms for 50 routines).
**Action:** Do not use `Set` for lookups on extremely small arrays (like days of the week) inside loops. Look for optimizations elsewhere.
## 2024-05-15 - Array `.join('')` vs String Concatenation `+=` in deep loops
**Learning:** String concatenation using `+=` inside a loop (even ~300 iterations per day * 365 days) is actually slightly faster in V8 than pre-allocating an array and using `.join('')`. The `.join('')` approach measured slightly slower (from ~4997ms to ~5346ms).
**Action:** Do not refactor `+=` string concatenation to array `.join('')` for HTML construction loops unless dealing with extremely massive, megabyte-sized strings where GC becomes the primary bottleneck.
## 2024-05-15 - Extracting Map lookups from loops
**Learning:** Extracting `Map.get(dateStr)` outside of the `sortedRoutinesForCells.forEach` loop is a small, low-risk, high-value win that reduces overhead from Map hashing.
**Action:** Always extract invariant lookups (like date-based Map lookups) outside of inner rendering loops.
