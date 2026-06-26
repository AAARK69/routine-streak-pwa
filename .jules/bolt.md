
## 2024-05-18 - [Optimizing sort comparators with Map caching]
**Learning:** `calculateStreak` inside `ui.js` was being called during every single comparison in the `.sort()` method, which caused performance degradation on larger datasets due to $O(N \log N)$ complexity, combined with another $O(N)$ hit in the subsequent render loop.
**Action:** When sorting relies on the output of an expensive pure function, pre-calculate the result for all items ($O(N)$), store the results in a `Map` keyed by ID, and lookup values from the map inside the sort comparator.
