## 2024-06-08 - Array Scans in Nested Date Loops
**Learning:** Found a performance bottleneck where `state.routines.some(r => r.id === id)` (an $O(M)$ array scan) was used inside historical multi-day loops (like calculating streaks over 30 to 365 days) yielding an $O(N \times M)$ overhead per render.
**Action:** Always extract static array searches into pre-computed $O(1)$ lookup structures like `new Set()` or Hash Maps before entering hot multi-day rendering loops.
