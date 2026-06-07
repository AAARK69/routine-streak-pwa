## 2026-06-07 - Schwartzian Transform for Expensive Sorting

**Learning:** When sorting an array based on values that must be computed using expensive, codebase-specific operations (like `calculateStreak`, which sweeps chronologically across dates), the sorting comparator recalculates the values $O(N \log N)$ times.
**Action:** Use a Schwartzian transform (decorate-sort-undecorate or map-sort-map) to pre-compute the expensive properties *once* into an intermediate object, sort that object array, and then destructure or map back the result to eliminate redundant calculations.
