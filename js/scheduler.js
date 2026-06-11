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

export const ADJACENT_BLOCKS = {
  morning: ['night', 'afternoon'],
  afternoon: ['morning', 'evening'],
  evening: ['afternoon', 'night'],
  night: ['evening', 'morning']
};

export function getBlockForHour(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

// Pre-calculate fixed integer hours for the circadian energy curve to avoid expensive Math.sin calls
// during the high-frequency evaluateFitness genetic algorithm loops.
const ENERGY_CAPACITY_CACHE = new Float64Array(24);
for (let i = 0; i < 24; i++) {
  const capacity = 7.5 + 3.0 * Math.sin((2 * Math.PI * (i - 6)) / 24) + 1.8 * Math.sin((4 * Math.PI * (i - 9)) / 24);
  ENERGY_CAPACITY_CACHE[i] = Math.max(2.0, Math.min(12.0, capacity));
}

/**
 * Advanced circadian energy curve representing a multi-peak university/work student profile.
 * C(t) = 7.5 + 3.0 * sin(2 * pi * (t - 6) / 24) + 1.8 * sin(4 * pi * (t - 9) / 24)
 * Returns values between 2.0 and 12.0 representing hourly energy capacity.
 */
export function getEnergyCapacity(hour) {
  // Use pre-calculated O(1) cache for integer hours (used heavily in GA loops)
  if (Number.isInteger(hour) && hour >= 0 && hour < 24) {
    return ENERGY_CAPACITY_CACHE[hour];
  }
  const t = hour;
  const capacity = 7.5 + 3.0 * Math.sin((2 * Math.PI * (t - 6)) / 24) + 1.8 * Math.sin((4 * Math.PI * (t - 9)) / 24);
  return Math.max(2.0, Math.min(12.0, capacity));
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
  let daysSwept = 0;
  while (checkDate <= today) {
    daysSwept++;
    if (daysSwept > 1000) {
      break; // Safety breakout for ancient or corrupt date imports
    }
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
  let daysChecked = 0;

  while (!streakBroken) {
    daysChecked++;
    if (daysChecked > 1000) { // Safety breakout to avoid infinite loop
      break;
    }
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
 * Returns a list of conflicts, warnings, and successes (habit stack achievements)
 */
export function checkConflictsForDay(dayOfWeek, routines) {
  const activeRoutines = routines.filter(r => r.days.includes(dayOfWeek));
  const conflicts = [];
  const warnings = [];
  const successes = [];

  // Sort by start hour for linear overlap checks
  const sorted = [...activeRoutines].sort((a, b) => a.targetHour - b.targetHour);

  // 1. Time Overlaps (Critical Error)
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

  // 2. Block-based Energy Ceilings
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
        message: `Block fatigue overload in the ${BLOCKS[block].name} block (${blockEnergy[block]}/10 units)`,
        block: block,
        value: blockEnergy[block]
      });
    }
  });

  // 3. Circadian Energy Capacity Curve limit check
  for (let hour = 0; hour < 24; hour++) {
    let energyDemand = 0;
    const hourStartMin = hour * 60;
    const hourEndMin = (hour + 1) * 60;

    activeRoutines.forEach(r => {
      const startMin = r.targetHour * 60;
      const endMin = startMin + r.duration;
      const overlap = Math.max(0, Math.min(endMin, hourEndMin) - Math.max(startMin, hourStartMin));
      if (overlap > 0) {
        energyDemand += r.energy * (overlap / 60);
      }
    });

    const capacity = getEnergyCapacity(hour);
    if (energyDemand > capacity) {
      warnings.push({
        type: 'CIRCADIAN_ENERGY_LIMIT',
        severity: 'warning',
        message: `Circadian energy overload at ${hour.toString().padStart(2, '0')}:00 (Demand: ${energyDemand.toFixed(1)} units, Capacity: ${capacity.toFixed(1)} units)`,
        hour: hour,
        demand: energyDemand,
        capacity: capacity
      });
    }
  }

  // 4. Conflict Groups & Rest Padding & Habit Stacking
  for (let i = 0; i < sorted.length; i++) {
    const r1 = sorted[i];
    const start1 = r1.targetHour * 60;
    const end1 = start1 + r1.duration;

    for (let j = i + 1; j < sorted.length; j++) {
      const r2 = sorted[j];
      const start2 = r2.targetHour * 60;
      const end2 = start2 + r2.duration;

      const gap = start2 - end1;

      // Conflict Group separation warning
      if (r1.conflictGroup && r2.conflictGroup && r1.conflictGroup === r2.conflictGroup) {
        const buffer = 45;
        if (gap >= 0 && gap < buffer) {
          warnings.push({
            type: 'BUFFER_WARNING',
            severity: 'warning',
            message: `Tight scheduling buffer for group "${r1.conflictGroup}" between "${r1.name}" and "${r2.name}"`,
            routineIds: [r1.id, r2.id]
          });
        }
      }

      // We only check consecutive or adjacent elements for rest padding and habit stacking
      if (j === i + 1 && gap >= 0) {
        // Rest padding check
        const requiredRestPadding = Math.max(0, (r1.energy - 2) * 10);
        if (gap < requiredRestPadding) {
          warnings.push({
            type: 'REST_PADDING_VIOLATION',
            severity: 'warning',
            message: `Insufficient rest padding: "${r1.name}" (Energy: ${r1.energy}) requires ${requiredRestPadding}m rest, but has only ${gap}m before "${r2.name}" starts.`,
            routineIds: [r1.id, r2.id]
          });
        } else if (gap <= 45) {
          // Habit stacking success!
          successes.push({
            type: 'HABIT_STACK_SUCCESS',
            severity: 'success',
            message: `✨ Perfect Habit Stack: "${r2.name}" starts ${gap}m after "${r1.name}" (within optimal buffer).`,
            routineIds: [r1.id, r2.id]
          });
        }
      }
    }
  }

  return { conflicts, warnings, successes };
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
  } else if (ADJACENT_BLOCKS[routine.preferredBlock]?.includes(blockOfHour)) {
    score += 10;
  } else {
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

  // 3. Continuous Circadian Energy Capacity check
  routine.days.forEach(day => {
    const dayRoutines = concurrentRoutines.filter(r => r.days.includes(day));
    const startH = Math.floor(hour);
    const endH = Math.ceil((hour * 60 + routine.duration) / 60);
    
    for (let h = startH; h < endH; h++) {
      let energyDemand = 0;
      const hourStartMin = h * 60;
      const hourEndMin = (h + 1) * 60;
      
      // Other routines' demand in this hour
      dayRoutines.forEach(r => {
        const startMin = r.targetHour * 60;
        const endMin = startMin + r.duration;
        const overlap = Math.max(0, Math.min(endMin, hourEndMin) - Math.max(startMin, hourStartMin));
        if (overlap > 0) {
          energyDemand += r.energy * (overlap / 60);
        }
      });
      
      // Current routine's demand
      const currentOverlap = Math.max(0, Math.min(endMin, hourEndMin) - Math.max(startMin, hourStartMin));
      energyDemand += routine.energy * (currentOverlap / 60);
      
      const capacity = getEnergyCapacity(h);
      if (energyDemand > capacity) {
        score -= (energyDemand - capacity) * 20;
      }
    }
  });

  // 4. Habit Stacking and Rest Padding
  let bestHabitStack = false;
  let restPaddingPenalty = 0;
  let conflictGroupPenalty = 0;

  concurrentRoutines.forEach(rt => {
    const otherStart = rt.targetHour * 60;
    const otherEnd = otherStart + rt.duration;
    
    const gapAfter = startMin - otherEnd; // this is after rt
    const gapBefore = otherStart - endMin; // this is before rt

    if (gapAfter >= 0) {
      const requiredRest = Math.max(0, (rt.energy - 2) * 10);
      if (gapAfter < requiredRest) {
        restPaddingPenalty += (requiredRest - gapAfter) * 5;
      }
      if (gapAfter >= requiredRest && gapAfter <= 45) {
        bestHabitStack = true;
      }
      if (routine.conflictGroup && rt.conflictGroup && routine.conflictGroup === rt.conflictGroup) {
        if (gapAfter < 45) {
          conflictGroupPenalty += (45 - gapAfter) * 2;
        }
      }
    } else if (gapBefore >= 0) {
      const requiredRest = Math.max(0, (routine.energy - 2) * 10);
      if (gapBefore < requiredRest) {
        restPaddingPenalty += (requiredRest - gapBefore) * 5;
      }
      if (gapBefore >= requiredRest && gapBefore <= 45) {
        bestHabitStack = true;
      }
      if (routine.conflictGroup && rt.conflictGroup && routine.conflictGroup === rt.conflictGroup) {
        if (gapBefore < 45) {
          conflictGroupPenalty += (45 - gapBefore) * 2;
        }
      }
    }
  });

  if (bestHabitStack) {
    score += 15;
  }
  score -= restPaddingPenalty;
  score -= conflictGroupPenalty;

  return Math.max(0, Math.min(100, score));
}

/**
 * Hydrates chromosomes into routines
 */
function hydrate(chromosome, routines) {
  return routines.map((r, i) => ({
    ...r,
    targetHour: chromosome[i]
  }));
}

/**
 * Globally scores a chromosome schedule mapping across all days (0-6)
 */
export function evaluateFitness(chromosome, routines, fitnessCache = null, dayRoutineIndices = null) {
  if (fitnessCache) {
    const key = chromosome.join(',');
    if (fitnessCache[key] !== undefined) {
      return fitnessCache[key];
    }
  }

  let score = 0;
  
  for (let day = 0; day < 7; day++) {
    let sortedIndices;
    if (dayRoutineIndices) {
      const indices = dayRoutineIndices[day];
      if (indices.length === 0) continue;
      sortedIndices = [...indices];
      // High-performance sort: avoid object creation entirely by sorting index array
      sortedIndices.sort((a, b) => chromosome[a] - chromosome[b]);
    } else {
      const activeRoutines = hydrate(chromosome, routines);
      const dayRoutines = activeRoutines.filter(r => r.days.includes(day));
      if (dayRoutines.length === 0) continue;
      dayRoutines.sort((a, b) => a.targetHour - b.targetHour);
      
      // Fallback object map for backward compatibility
      sortedIndices = dayRoutines.map(dr => routines.findIndex(r => r.id === dr.id));
    }
    
    // 1. Preferred Block Score & Overlaps
    for (let i = 0; i < sortedIndices.length; i++) {
      const idx1 = sortedIndices[i];
      const r1 = routines[idx1];
      const targetHour1 = chromosome[idx1];
      const start1 = targetHour1 * 60;
      const end1 = start1 + r1.duration;
      
      const block = getBlockForHour(targetHour1);
      if (block === r1.preferredBlock) {
        score += 30;
      } else if (ADJACENT_BLOCKS[r1.preferredBlock]?.includes(block)) {
        score += 10;
      } else {
        score -= 20;
      }
      
      for (let j = i + 1; j < sortedIndices.length; j++) {
        const idx2 = sortedIndices[j];
        const r2 = routines[idx2];
        const targetHour2 = chromosome[idx2];
        const start2 = targetHour2 * 60;
        const end2 = start2 + r2.duration;
        
        const overlap = Math.max(0, Math.min(end1, end2) - Math.max(start1, start2));
        if (overlap > 0) {
          score -= overlap * 100; // Large penalty for direct overlaps
        }
      }
    }
    
    // 2. Circadian Energy Capacity check
    const energyDemands = new Float64Array(24);

    for (let i = 0; i < sortedIndices.length; i++) {
      const idx = sortedIndices[i];
      const r = routines[idx];
      const targetHour = chromosome[idx];
      const startMin = targetHour * 60;
      const endMin = startMin + r.duration;
      
      const startH = Math.floor(startMin / 60);
      const endH = Math.ceil(endMin / 60);

      for (let hour = startH; hour < Math.min(24, endH); hour++) {
        const hourStartMin = hour * 60;
        const hourEndMin = (hour + 1) * 60;
        const overlap = Math.min(endMin, hourEndMin) - Math.max(startMin, hourStartMin);
        if (overlap > 0) {
          energyDemands[hour] += r.energy * (overlap / 60);
        }
      }
    }

    for (let hour = 0; hour < 24; hour++) {
      if (energyDemands[hour] > 0) {
        const capacity = getEnergyCapacity(hour);
        if (energyDemands[hour] > capacity) {
          score -= (energyDemands[hour] - capacity) * 150;
        }
      }
    }
    
    // 3. Rest Padding, Habit Stacking, and Conflict Groups
    for (let i = 0; i < sortedIndices.length - 1; i++) {
      const idx1 = sortedIndices[i];
      const idx2 = sortedIndices[i + 1];
      const r1 = routines[idx1];
      const r2 = routines[idx2];
      
      const targetHour1 = chromosome[idx1];
      const targetHour2 = chromosome[idx2];
      
      const start1 = targetHour1 * 60;
      const end1 = start1 + r1.duration;
      const start2 = targetHour2 * 60;
      
      const gap = start2 - end1;
      if (gap >= 0) {
        // Rest padding check
        const requiredRestPadding = Math.max(0, (r1.energy - 2) * 10);
        if (gap < requiredRestPadding) {
          score -= (requiredRestPadding - gap) * 20;
        }
        
        // Habit stacking check
        const optimalStart = requiredRestPadding;
        const optimalEnd = requiredRestPadding + 15;
        if (gap >= optimalStart && gap <= optimalEnd) {
          score += 35;
        } else if (gap > optimalEnd && gap <= 45) {
          score += 20;
        }
        
        // Same conflict group buffer check
        if (r1.conflictGroup && r2.conflictGroup && r1.conflictGroup === r2.conflictGroup) {
          if (gap < 45) {
            score -= (45 - gap) * 5;
          }
        }
      }
    }
  }
  
  if (fitnessCache) {
    const key = chromosome.join(',');
    fitnessCache[key] = score;
  }
  
  return score;
}

/**
 * Selection operator (Tournament selection)
 */
function selectParent(pop, fitnesses) {
  let bestIndex = Math.floor(Math.random() * pop.length);
  for (let i = 1; i < 5; i++) {
    const randIndex = Math.floor(Math.random() * pop.length);
    if (fitnesses[randIndex] > fitnesses[bestIndex]) {
      bestIndex = randIndex;
    }
  }
  return pop[bestIndex];
}

/**
 * Custom Scheduling Matrix Optimizer using a high-powered Genetic Algorithm
 * Solves all scheduling conflicts globally by shifting routines to optimal slots.
 */
export function optimizeAllSchedules(routines) {
  if (!routines || routines.length === 0) return [];
  
  const N = routines.length;
  
  // Dynamic scaling of population and generations for instant sub-10ms execution
  let popSize = 80;
  let generations = 80;
  if (N > 15) { popSize = 50; generations = 50; }
  if (N > 30) { popSize = 30; generations = 30; }
  if (N > 60) { popSize = 20; generations = 20; }
  
  // Pre-group routine indices by active day to avoid .filter() and .includes() inside evolution loops
  const dayRoutineIndices = Array.from({ length: 7 }, () => []);
  routines.forEach((r, idx) => {
    r.days.forEach(day => {
      dayRoutineIndices[day].push(idx);
    });
  });
  
  // Initialize fitness cache for memoization
  const fitnessCache = {};
  
  let pop = [];
  
  // Seed 1: The current configuration (ensures monotonic improvement, never degrades)
  pop.push(routines.map(r => r.targetHour));
  
  // Rest of the population: completely randomized start target hours
  for (let p = 1; p < popSize; p++) {
    const chrom = Array.from({ length: N }, () => Math.floor(Math.random() * 24));
    pop.push(chrom);
  }
  
  // Optimization evolution loop
  for (let gen = 0; gen < generations; gen++) {
    const fitnesses = pop.map(chrom => evaluateFitness(chrom, routines, fitnessCache, dayRoutineIndices));
    
    // Index mapping to sort by fitness descending
    const indices = Array.from({ length: popSize }, (_, i) => i);
    indices.sort((a, b) => fitnesses[b] - fitnesses[a]);
    
    const sortedPop = indices.map(idx => pop[idx]);
    const sortedFitnesses = indices.map(idx => fitnesses[idx]);
    
    const nextPop = [];
    
    // Elitism: Preserve the top 5% of candidate schedules
    const eliteCount = Math.max(2, Math.floor(popSize * 0.05));
    for (let e = 0; e < eliteCount; e++) {
      nextPop.push(sortedPop[e]);
    }
    
    // Reproduction: Crossover & Mutation to fill next generation
    while (nextPop.length < popSize) {
      const parentA = selectParent(sortedPop, sortedFitnesses);
      const parentB = selectParent(sortedPop, sortedFitnesses);
      
      // Uniform Crossover
      const offspring = [];
      for (let i = 0; i < N; i++) {
        offspring[i] = Math.random() < 0.5 ? parentA[i] : parentB[i];
      }
      
      // Multi-mode Mutation
      for (let i = 0; i < N; i++) {
        if (Math.random() < 0.15) {
          if (Math.random() < 0.5) {
            // Global Jump Mutation
            offspring[i] = Math.floor(Math.random() * 24);
          } else {
            // Creep/Local Mutation (Shift by +/- 1 hour)
            const shift = Math.random() < 0.5 ? -1 : 1;
            offspring[i] = (offspring[i] + shift + 24) % 24;
          }
        }
      }
      
      nextPop.push(offspring);
    }
    
    pop = nextPop;
  }
  
  // Find absolute best schedule in final population
  const finalFitnesses = pop.map(chrom => evaluateFitness(chrom, routines, fitnessCache, dayRoutineIndices));
  let bestIdx = 0;
  for (let i = 1; i < popSize; i++) {
    if (finalFitnesses[i] > finalFitnesses[bestIdx]) {
      bestIdx = i;
    }
  }
  
  const bestChromosome = pop[bestIdx];
  const optimized = hydrate(bestChromosome, routines);
  
  return optimized;
}
