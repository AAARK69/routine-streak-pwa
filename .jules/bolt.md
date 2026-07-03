## 2024-05-18 - Deep Array Search Optimization
**Learning:** Always map arrays into O(1) Set objects beforehand when evaluating active states inside deep rendering loops.
**Action:** Replace `Array.prototype.some()` and `Array.prototype.includes()` in nested loops with O(1) `Set.prototype.has()` to avoid main thread blocking.
