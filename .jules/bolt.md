## 2026-06-14 - Expensive History Calculation within Sort Comparisons
**Learning:** Found an O(N log N) performance trap in UI rendering where `calculateStreak` (which recursively/iteratively checks up to 1000 days of history for a routine) was called during every comparison within `Array.sort()`, followed by an additional call inside the subsequent `.forEach` map.
**Action:** Use the Schwartzian Transform (Map -> Sort -> Map) pattern to pre-calculate expensive properties (`streakData`) once per routine before sorting. This guarantees expensive operations run strictly O(N) times.
