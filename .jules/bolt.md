## 2026-06-02 - Array Sort Redundant Calcs
**Learning:** In native JS array `.sort()`, complex computations inside the comparator trigger repeatedly (O(N log N)), creating hidden bottlenecks for UI rendering.
**Action:** Use Schwartzian transform (map-sort-map) to pre-calculate expensive operations once before sorting to guarantee O(N) evaluations.
