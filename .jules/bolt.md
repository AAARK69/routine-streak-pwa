## 2024-05-24 - Expensive Sorting Comparators
**Learning:** Calling O(N) operations like `calculateStreak` inside an `Array.prototype.sort()` comparator scales poorly since comparators execute `O(N log N)` times. In `renderStreaks` within `ui.js`, computing streaks for both items on every sort comparison is a major bottleneck as the number of scheduled routines and log entries grows.
**Action:** Pre-compute and map expensive derived values before sorting, sort the mapped array, and then reuse the precomputed values in subsequent mapping or rendering.
