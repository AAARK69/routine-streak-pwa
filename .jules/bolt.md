## 2024-05-24 - Pre-calculation for Array Sorting
**Learning:** Performing computationally expensive operations like `calculateStreak` inside an `Array.prototype.sort()` comparator function results in repeated evaluations (O(N log N)). In components that render frequently, this can cause significant UI thread blocking and lag.
**Action:** When sorting an array based on derived/calculated values, always use a Schwartzian transform or map-based memoization to pre-calculate those values in O(N) time before running the sort comparator.
