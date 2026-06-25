import { calculateStreak } from './js/scheduler.js';

const state = {
  routines: Array.from({length: 50}, (_, i) => ({ id: `rt_${i}`, days: [0,1,2,3,4,5,6], name: `rt_${i}`, category: 'Health' })),
  completions: {}
};

for (let i = 0; i < 365 * 2; i++) { // 2 years of completions
  const d = new Date();
  d.setDate(d.getDate() - i);
  state.completions[d.toISOString().split('T')[0]] = state.routines.slice(0, 40).map(r => r.id); // 80% completion rate
}

const todayStr = new Date().toISOString().split('T')[0];

console.time('Unoptimized renderStreaks sorting');
for (let i = 0; i < 50; i++) { // Simulate 50 renders
  const sortedRoutines = [...state.routines].sort((a, b) => {
    const sA = calculateStreak(a, state.completions, todayStr);
    const sB = calculateStreak(b, state.completions, todayStr);
    return sB.currentStreak - sA.currentStreak;
  });

  sortedRoutines.forEach(rt => {
    const { currentStreak, maxStreak } = calculateStreak(rt, state.completions, todayStr);
  });
}
console.timeEnd('Unoptimized renderStreaks sorting');

console.time('Optimized renderStreaks sorting (O(N) caching)');
for (let i = 0; i < 50; i++) {
  // Pre-calculate streaks once per routine
  const routinesWithStreaks = state.routines.map(rt => {
    const streaks = calculateStreak(rt, state.completions, todayStr);
    return {
      routine: rt,
      currentStreak: streaks.currentStreak,
      maxStreak: streaks.maxStreak
    };
  });

  const sortedRoutines = routinesWithStreaks.sort((a, b) => {
    return b.currentStreak - a.currentStreak;
  });

  sortedRoutines.forEach(({ routine: rt, currentStreak, maxStreak }) => {
    // Same render logic here...
  });
}
console.timeEnd('Optimized renderStreaks sorting (O(N) caching)');