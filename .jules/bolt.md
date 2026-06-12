## 2024-12-06 - Pre-calculation for sorting
**Learning:** Found an O(N log N) sorting operation that was repeating expensive chronological calculations (`calculateStreak`) multiple times per item in `ui.js` `renderStreaks`.
**Action:** Always check sorting comparators for expensive function calls. Use a Map to pre-calculate values in O(N) time before sorting to optimize performance significantly.
