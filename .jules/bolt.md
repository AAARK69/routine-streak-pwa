## 2024-05-18 - Avoid redundant loop executions
**Learning:** O(N log N) operations inside sort functions can become bottlenecks, especially when O(N) operations inside sort callbacks are slow such as the `calculateStreak` operations.
**Action:** Extract expensive calculations out of sorting loops whenever possible.
