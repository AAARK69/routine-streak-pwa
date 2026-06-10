## 2026-06-10 - O(N log N) Sorting Bottleneck in `ui.js`
**Learning:** `calculateStreak` in `scheduler.js` was being redundantly executed multiple times per routine inside the `.sort()` comparator of `renderStreaks`.
**Action:** Use a Schwartzian transform pattern: pre-calculate expensive derivations into an array via `.map()`, sort the mapped array, and iterate. This reduces time complexity for expensive calls from O(N log N) + O(N) to exactly O(N).
