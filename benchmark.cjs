const state = {
  routines: Array.from({ length: 50 }, (_, i) => ({ id: `rt_${i}`, days: [1,3,5] })),
  completions: {}
};
for(let i=0; i<30; i++) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const dStr = d.toISOString().split('T')[0];
  state.completions[dStr] = Array.from({length: 10}, (_, j) => `rt_${j}`);
}

const activeRoutineIds = new Set(state.routines.map(r => r.id));

console.time('original');
for(let k=0; k<1000; k++) {
  let totalScheduledSlots = 0;
  let totalCompletedSlots = 0;
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const scheduledRoutines = state.routines.filter(r => r.days.includes(dayOfWeek));
    totalScheduledSlots += scheduledRoutines.length;
    const completedIds = state.completions[dateStr] || [];
    const validCompletions = completedIds.filter(id => activeRoutineIds.has(id));
    totalCompletedSlots += validCompletions.length;
  }
  const yieldRate = totalScheduledSlots > 0 ? Math.round((totalCompletedSlots / totalScheduledSlots) * 100) : 0;

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const scheduled = state.routines.filter(r => r.days.includes(dayOfWeek));
    const completed = (state.completions[dateStr] || []).filter(id => activeRoutineIds.has(id));
    let intensity = 0;
    if (scheduled.length > 0) {
      const pct = completed.length / scheduled.length;
      if (pct === 0) intensity = 0;
      else if (pct < 0.4) intensity = 1;
      else if (pct < 0.8) intensity = 2;
      else intensity = 3;
    }
    const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
console.timeEnd('original');


console.time('optimized');
for(let k=0; k<1000; k++) {
  const routineCountsByDay = [0, 0, 0, 0, 0, 0, 0];
  state.routines.forEach(r => {
    if (r.days) {
      r.days.forEach(day => routineCountsByDay[day]++);
    }
  });

  let totalScheduledSlots = 0;
  let totalCompletedSlots = 0;

  const today = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    const scheduledCount = routineCountsByDay[dayOfWeek];
    const completedIds = state.completions[dateStr] || [];

    let completedCount = 0;
    for (let j = 0; j < completedIds.length; j++) {
      if (activeRoutineIds.has(completedIds[j])) {
        completedCount++;
      }
    }

    totalScheduledSlots += scheduledCount;
    totalCompletedSlots += completedCount;

    let intensity = 0; // default empty
    if (scheduledCount > 0) {
      const pct = completedCount / scheduledCount;
      if (pct === 0) intensity = 0;
      else if (pct < 0.4) intensity = 1;
      else if (pct < 0.8) intensity = 2;
      else intensity = 3;
    }

    const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  const yieldRate = totalScheduledSlots > 0 ? Math.round((totalCompletedSlots / totalScheduledSlots) * 100) : 0;
}
console.timeEnd('optimized');
