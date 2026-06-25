## 2024-05-24 - Sorting Arrays with Expensive History Parsing
**Learning:** `calculateStreak` performs a sweeping historical loop over up to 1000 days of completions. Calling it inside `Array.prototype.sort()` comparators and the subsequent `.forEach` loop resulted in exponential performance decay as completion history grows.
**Action:** Always pre-calculate expensive derivations involving historical loops by mapping them into a temporary structure (O(N)) before sorting or rendering.
