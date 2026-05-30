/**
 * Scheduler Optimization Matrix & Rules Engine
 */

// Define hour ranges for preferred blocks
export const BLOCKS = {
  night: { name: 'Night', min: 0, max: 5 },
  morning: { name: 'Morning', min: 6, max: 11 },
  afternoon: { name: 'Afternoon', min: 12, max: 17 },
  evening: { name: 'Evening', min: 18, max: 23 }
};

export function getBlockForHour(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

/**
 * Calculates current streak and maximum all-time streak for a routine based on its completion history.
 * A streak is calculated strictly on scheduled days (i.e. skipping non-scheduled days).
 */
export function calculateStreak(routine, completions, todayStr = new Date().toISOString().split('T')[0]) {
  const scheduledDays = routine.days;
  if (!scheduledDays || scheduledDays.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // 1. Extract and sort completion dates for this routine
  const completedDates = new Set();
  Object.keys(completions).forEach(dateStr => {
    if (completions[dateStr].includes(routine.id)) {
      completedDates.add(dateStr);
    }
  });

  if (completedDates.size === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // 2. Chronological sweeping from the first completion up to today to find all-time max streak
  const sortedCompletions = Array.from(completedDates).sort();
  const startDate = new Date(sortedCompletions[0]);
  const today = new Date(todayStr);
  
  let maxStreak = 0;
  let runningStreak = 0;
  
  let checkDate = new Date(startDate);
  while (checkDate <= today) {
    const checkStr = checkDate.toISOString().split('T')[0];
    const dayOfWeek = checkDate.getDay();
    
    if (scheduledDays.includes(dayOfWeek)) {
      if (completedDates.has(checkStr)) {
        runningStreak++;
        if (runningStreak > maxStreak) {
          maxStreak = runningStreak;
        }
      } else {
        // If checking a date strictly before today, a miss breaks the streak
        if (checkStr !== todayStr) {
          runningStreak = 0;
        }
      }
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  // 3. Calculate current streak (looking backward from today)
  let currentStreak = 0;
  let lookDate = new Date(today);
  let streakBroken = false;
  let isFirstCheck = true;

  while (!streakBroken) {
    const lookStr = lookDate.toISOString().split('T')[0];
    const dayOfWeek = lookDate.getDay();

    if (scheduledDays.includes(dayOfWeek)) {
      if (completedDates.has(lookStr)) {
        currentStreak++;
      } else {
        // If it's today and they haven't completed it yet, the streak isn't broken unless it's yesterday they missed
        if (isFirstCheck && lookStr === todayStr) {
          // Streak is still active based on yesterday
        } else {
          streakBroken = true;
        }
      }
    }
    
    isFirstCheck = false;
    lookDate.setDate(lookDate.getDate() - 1);
    
    // Safety break if checking too far in past
    if (currentStreak > completedDates.size + 2) break;
  }

  // Ensure max streak is at least current streak
  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
  }

  return { currentStreak, maxStreak };
}

/**
 * Validates the full schedule for a given day (0-6)
 * Returns a list of conflicts, energy overloads, and warning flags
 */
export function checkConflictsForDay(dayOfWeek, routines) {
  const activeRoutines = routines.filter(r => r.days.includes(dayOfWeek));
  const conflicts = [];
  const warnings = [];

  // Sort by start hour for linear overlap checks
  const sorted = [...activeRoutines].sort((a, b) => a.targetHour - b.targetHour);

  // 1. Time Overlaps
  for (let i = 0; i < sorted.length; i++) {
    const r1 = sorted[i];
    const start1 = r1.targetHour * 60;
    const end1 = start1 + r1.duration;

    for (let j = i + 1; j < sorted.length; j++) {
      const r2 = sorted[j];
      const start2 = r2.targetHour * 60;
      const end2 = start2 + r2.duration;

      // Check overlap
      if (start1 < end2 && start2 < end1) {
        conflicts.push({
          type: 'OVERLAP',
          severity: 'error',
          message: `Overlap between "${r1.name}" and "${r2.name}"`,
          routineIds: [r1.id, r2.id]
        });
      }
    }
  }

  // 2. Energy ceilings in blocks (Max energy in any block = 10)
  const blockEnergy = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  
  activeRoutines.forEach(rt => {
    const block = getBlockForHour(rt.targetHour);
    blockEnergy[block] += rt.energy;
  });

  Object.keys(blockEnergy).forEach(block => {
    if (blockEnergy[block] > 10) {
      warnings.push({
        type: 'ENERGY_LIMIT',
        severity: 'warning',
        message: `Energy surcharge in the ${BLOCKS[block].name} block (${blockEnergy[block]}/10 units)`,
        block: block,
        value: blockEnergy[block]
      });
    }
  });

  // 3. Conflict Groups (Items with same conflict group overlapping or overlapping buffer)
  for (let i = 0; i < sorted.length; i++) {
    const r1 = sorted[i];
    if (!r1.conflictGroup) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const r2 = sorted[j];
      if (!r2.conflictGroup || r1.conflictGroup !== r2.conflictGroup) continue;

      const start1 = r1.targetHour * 60;
      const end1 = start1 + r1.duration;
      const start2 = r2.targetHour * 60;
      const end2 = start2 + r2.duration;

      // Check if they are scheduled within 45 minutes of each other (buffer check for fatigue)
      const buffer = 45;
      const r1Before = (start2 >= end1) && (start2 < end1 + buffer);
      const r2Before = (start1 >= end2) && (start1 < end2 + buffer);

      if (r1Before || r2Before) {
        warnings.push({
          type: 'BUFFER_WARNING',
          severity: 'warning',
          message: `Tight scheduling buffer for group "${r1.conflictGroup}" between "${r1.name}" and "${r2.name}"`,
          routineIds: [r1.id, r2.id]
        });
      }
    }
  }

  return { conflicts, warnings };
}

/**
 * Score a specific hour (0-23) for scheduling a routine
 * Scale: 0 to 100
 */
export function scoreHourForRoutine(hour, routine, otherRoutines) {
  // Filter other routines that share at least one active day with this routine
  const concurrentRoutines = otherRoutines.filter(r => 
    r.id !== routine.id && 
    r.days.some(d => routine.days.includes(d))
  );

  let score = 50; // Starting baseline

  // 1. Preferred Block Check
  const blockOfHour = getBlockForHour(hour);
  if (routine.preferredBlock === blockOfHour) {
    score += 30;
  } else if (
    (routine.preferredBlock === 'morning' && blockOfHour === 'afternoon') ||
    (routine.preferredBlock === 'afternoon' && blockOfHour === 'morning') ||
    (routine.preferredBlock === 'evening' && blockOfHour === 'afternoon')
  ) {
    // Adjacent blocks are okay
    score += 10;
  } else {
    // Completely opposite blocks penalized
    score -= 20;
  }

  // 2. Direct Overlap Check (Fatal Penalty)
  const startMin = hour * 60;
  const endMin = startMin + routine.duration;

  let hasOverlap = false;
  concurrentRoutines.forEach(rt => {
    const otherStart = rt.targetHour * 60;
    const otherEnd = otherStart + rt.duration;
    if (startMin < otherEnd && otherStart < endMin) {
      hasOverlap = true;
    }
  });

  if (hasOverlap) {
    return 0; // Hard fail
  }

  // 3. Energy check
  // Compute what the energy level in the block would be if placed here
  routine.days.forEach(day => {
    const dayRoutines = otherRoutines.filter(r => r.id !== routine.id && r.days.includes(day));
    let energyInBlock = 0;
    dayRoutines.forEach(r => {
      if (getBlockForHour(r.targetHour) === blockOfHour) {
        energyInBlock += r.energy;
      }
    });

    if (energyInBlock + routine.energy > 10) {
      score -= 25; // Fatigue penalty
    }
  });

  // 4. Habit Stacking/Adjacent Buffers (+15 for items scheduled with 15-45m gaps)
  let bestHabitStack = false;
  concurrentRoutines.forEach(rt => {
    const otherStart = rt.targetHour * 60;
    const otherEnd = otherStart + rt.duration;
    
    const gapAfter = startMin - otherEnd;
    const gapBefore = otherStart - endMin;

    if ((gapAfter >= 5 && gapAfter <= 45) || (gapBefore >= 5 && gapBefore <= 45)) {
      bestHabitStack = true;
    }
  });

  if (bestHabitStack) {
    score += 15;
  }

  // Max cap
  return Math.max(0, Math.min(100, score));
}

/**
 * Custom Scheduling Matrix Optimizer
 * Solves all scheduling conflicts by shifting routines to optimal slots.
 */
export function optimizeAllSchedules(routines) {
  const optimized = JSON.parse(JSON.stringify(routines));
  
  // Sort routines by priority (highest priority solved first) and then by energy cost
  optimized.sort((a, b) => b.priority - a.priority || b.energy - a.energy);
  
  const placed = [];

  for (let i = 0; i < optimized.length; i++) {
    const routine = optimized[i];
    
    // Find best conflict-free hour
    let bestHour = routine.targetHour;
    let highestScore = -1;

    for (let hour = 0; hour < 24; hour++) {
      const score = scoreHourForRoutine(hour, routine, placed);
      if (score > highestScore) {
        highestScore = score;
        bestHour = hour;
      }
    }

    routine.targetHour = bestHour;
    placed.push(routine);
  }

  // Restore original ordering by ID for UI consistency
  const idMap = new Map(placed.map(r => [r.id, r]));
  return routines.map(orig => idMap.get(orig.id));
}
