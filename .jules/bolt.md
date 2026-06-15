## 2025-01-20 - [Redundant Expensive Function Calls in Array Sort]
**Learning:** `calculateStreak` is an expensive operation that iterates over completion history. Calling it directly inside an array `.sort()` comparator causes O(n log n) recalculations of the same data, leading to unnecessary main thread blocking and performance degradation.
**Action:** Always pre-calculate expensive derivations and memoize/map them before sorting (e.g., using a Schwartzian transform) to ensure the expensive function is only called O(n) times.
