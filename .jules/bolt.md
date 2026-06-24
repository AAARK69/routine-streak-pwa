## 2026-06-24 - Expensive Sorting Comparators

**Learning:** `calculateStreak` in `js/ui.js` iterates over 1000 days of history and does date math. It was called multiple times inside `sort`'s comparator, causing an O(N log N) performance bottleneck on larger datasets. Pre-caching expensive calculations via Maps *before* sorting operations significantly reduces render blocking.
**Action:** Always pre-calculate and cache complex derivations for lists in a `Map` prior to array sorting operations rather than evaluating inside the comparator function.