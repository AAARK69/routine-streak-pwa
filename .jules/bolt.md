## 2026-06-06 - O(N^2) Array Lookup Bottleneck in UI Renders
**Learning:** Found critical O(N^2) time complexity bottlenecks in UI methods that repeatedly checked active routines against completion history arrays using `array.some()` nested inside long `for` loops (e.g. 365-day loops).
**Action:** Identified and mitigated the bottleneck by instantiating O(1) Javascript `Set` lookups. Benchmark times improved from 1.031s to 151ms.
