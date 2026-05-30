/**
 * UI Renderer Module
 */
import { getBlockForHour, checkConflictsForDay, calculateStreak } from './scheduler.js';

// Color map for categories
export const CATEGORY_COLORS = {
  Academics: '#00f0ff', // Neon Cyan
  Health: '#00ff88',    // Neon Green
  Work: '#ff9500',      // Neon Orange
  Leisure: '#ff2d55'    // Neon Pink
};

/**
 * Format minutes into readable HH:MM 24h string
 */
function formatHour(hour) {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Render chronological card timeline for a specific day (0-6)
 */
export function renderTimeline(day, state, onToggleComplete, onEditClick) {
  const container = document.getElementById('timeline-list');
  container.innerHTML = '';

  const todayStr = new Date().toISOString().split('T')[0];
  const activeRoutines = state.routines.filter(r => r.days.includes(day));
  
  // Sort chronologically
  activeRoutines.sort((a, b) => a.targetHour - b.targetHour);

  if (activeRoutines.length === 0) {
    container.innerHTML = `
      <div class="settings-card" style="text-align: center; padding: 40px 20px;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 12px;">☕</span>
        <h3 style="color: var(--text-gray)">No routines scheduled for today</h3>
        <p style="font-size: 0.8rem; margin-top: 4px;">Click the + button to configure a routine.</p>
      </div>
    `;
    return;
  }

  activeRoutines.forEach(rt => {
    const isCompleted = (state.completions[todayStr] || []).includes(rt.id);
    const color = CATEGORY_COLORS[rt.category] || '#00f0ff';

    const card = document.createElement('div');
    card.className = `routine-card ${isCompleted ? 'completed' : ''}`;
    card.style.setProperty('--accent-color', color);
    
    // Build energy pip indicators
    let energyPips = '';
    for (let i = 1; i <= 5; i++) {
      energyPips += `<span class="energy-pip ${i <= rt.energy ? 'active' : ''}"></span>`;
    }

    card.innerHTML = `
      <div class="routine-card-left">
        <label class="custom-checkbox-wrapper" id="check-wrapper-${rt.id}">
          <input type="checkbox" class="custom-checkbox-input" id="check-${rt.id}" ${isCompleted ? 'checked' : ''}>
          <span class="checkbox-visual"></span>
        </label>
        
        <div class="routine-info">
          <h3 class="routine-title">${rt.name}</h3>
          
          <div class="routine-meta-row">
            <span class="badge-outline">${formatHour(rt.targetHour)}</span>
            <span class="badge-solid-dark">${rt.duration} mins</span>
            <span class="badge-solid-dark">${rt.category}</span>
            ${rt.conflictGroup ? `<span class="badge-outline" style="border-style: dashed; opacity: 0.7;">${rt.conflictGroup}</span>` : ''}
            <div class="energy-indicator" title="Energy: ${rt.energy}/5">
              ${energyPips}
            </div>
          </div>
        </div>
      </div>

      <div class="routine-card-actions">
        <button class="btn-edit" id="edit-${rt.id}" aria-label="Edit routine">⚙</button>
      </div>
    `;

    // Toggle complete listener
    const checkbox = card.querySelector(`#check-${rt.id}`);
    checkbox.addEventListener('change', () => {
      onToggleComplete(rt.id);
    });

    // Edit button listener
    const editBtn = card.querySelector(`#edit-${rt.id}`);
    editBtn.addEventListener('click', () => {
      onEditClick(rt);
    });

    container.appendChild(card);
  });
}

/**
 * Render 24-hour visual scheduling matrix grid & active conflict notifications
 */
export function renderMatrix(day, state, onEditClick) {
  // 1. Render conflicts list
  const feed = document.getElementById('matrix-conflict-feed');
  feed.innerHTML = '';

  const { conflicts, warnings } = checkConflictsForDay(day, state.routines);
  
  if (conflicts.length === 0 && warnings.length === 0) {
    feed.innerHTML = `
      <div class="conflict-alert" style="background: rgba(0, 255, 136, 0.05); border: 1px dashed var(--neon-green); color: var(--neon-green)">
        <span class="conflict-alert-icon">✓</span>
        <span>Schedule matrix fully optimized! Zero overlapping fatigue groups detected for today.</span>
      </div>
    `;
  } else {
    // Show errors first
    conflicts.forEach(c => {
      const alert = document.createElement('div');
      alert.className = 'conflict-alert error';
      alert.innerHTML = `
        <span class="conflict-alert-icon">⚠️</span>
        <span>${c.message}</span>
      `;
      feed.appendChild(alert);
    });

    // Show warnings
    warnings.forEach(w => {
      const alert = document.createElement('div');
      alert.className = 'conflict-alert warning';
      alert.innerHTML = `
        <span class="conflict-alert-icon">⚡</span>
        <span>${w.message}</span>
      `;
      feed.appendChild(alert);
    });
  }

  // 2. Render 24-hour rows
  const gridContainer = document.getElementById('matrix-grid-hours');
  gridContainer.innerHTML = '';

  const activeRoutines = state.routines.filter(r => r.days.includes(day));

  for (let hour = 0; hour < 24; hour++) {
    const row = document.createElement('div');
    row.className = 'matrix-row';

    // Find routines occupying this hour block
    // A routine occupies hour slots from targetHour to targetHour + Duration (converted to hours)
    const routinesInHour = activeRoutines.filter(rt => {
      const startHour = rt.targetHour;
      const endHour = rt.targetHour + (rt.duration / 60);
      return hour >= startHour && hour < endHour;
    });

    const hasConflict = routinesInHour.length > 1;

    let eventsHtml = '';
    routinesInHour.forEach(rt => {
      const color = CATEGORY_COLORS[rt.category] || '#00f0ff';
      eventsHtml += `
        <span class="matrix-event-badge ${hasConflict ? 'overlap-warn' : ''}" 
              style="--accent-color: ${color}; cursor: pointer;" 
              id="matrix-badge-${rt.id}-${hour}">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color}"></span>
          ${rt.name}
        </span>
      `;
    });

    row.innerHTML = `
      <div class="matrix-time">${formatHour(hour)}</div>
      <div class="matrix-events">${eventsHtml}</div>
    `;

    // Bind edit actions on badges
    routinesInHour.forEach(rt => {
      const badge = row.querySelector(`#matrix-badge-${rt.id}-${hour}`);
      if (badge) {
        badge.addEventListener('click', () => onEditClick(rt));
      }
    });

    gridContainer.appendChild(row);
  }
}

/**
 * Render streak grids, activity heatmaps, and individual routine streak badges
 */
export function renderStreaks(state) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // 1. Top Core Analytics
  const statsTotal = document.getElementById('stats-total-routines');
  const statsCompletions = document.getElementById('stats-total-completions');
  const statsAverage = document.getElementById('stats-average-completion');

  statsTotal.textContent = state.routines.length;

  let totalLoggedCompletions = 0;
  Object.values(state.completions).forEach(arr => {
    totalLoggedCompletions += arr.length;
  });
  statsCompletions.textContent = totalLoggedCompletions;

  // Calculate yield percentage of completed items over scheduled days
  let totalScheduledSlots = 0;
  let totalCompletedSlots = 0;
  
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // How many scheduled on this day
    const scheduledRoutines = state.routines.filter(r => r.days.includes(dayOfWeek));
    totalScheduledSlots += scheduledRoutines.length;

    // How many completed on this day
    const completedIds = state.completions[dateStr] || [];
    // Count only completions of routines currently defined
    const validCompletions = completedIds.filter(id => state.routines.some(r => r.id === id));
    totalCompletedSlots += validCompletions.length;
  }

  const yieldRate = totalScheduledSlots > 0 ? Math.round((totalCompletedSlots / totalScheduledSlots) * 100) : 0;
  statsAverage.textContent = `${yieldRate}%`;

  // 2. Renders 30-Day Activity Grid Heatmap
  const heatmapGrid = document.getElementById('streak-heatmap-grid');
  heatmapGrid.innerHTML = '';

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    const scheduled = state.routines.filter(r => r.days.includes(dayOfWeek));
    const completed = (state.completions[dateStr] || []).filter(id => state.routines.some(r => r.id === id));

    let intensity = 0; // default empty
    if (scheduled.length > 0) {
      const pct = completed.length / scheduled.length;
      if (pct === 0) intensity = 0;
      else if (pct < 0.4) intensity = 1;
      else if (pct < 0.8) intensity = 2;
      else intensity = 3;
    }

    const cell = document.createElement('div');
    cell.className = `heatmap-cell color-${intensity}`;
    
    // Simple native tooltip description
    const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    cell.title = `${formattedDate}: Completed ${completed.length}/${scheduled.length} (${Math.round((scheduled.length > 0 ? completed.length/scheduled.length : 0)*100)}%)`;

    heatmapGrid.appendChild(cell);
  }

  // 3. Render Individual Routine Streak Badges
  const streakContainer = document.getElementById('routine-streaks-container');
  streakContainer.innerHTML = '';

  if (state.routines.length === 0) {
    streakContainer.innerHTML = `
      <p style="text-align: center; color: var(--text-dim); padding: 20px 0;">No active routines to track.</p>
    `;
    return;
  }

  // Sort routines by priority / streak
  const sortedRoutines = [...state.routines].sort((a, b) => {
    const sA = calculateStreak(a, state.completions, todayStr);
    const sB = calculateStreak(b, state.completions, todayStr);
    return sB.currentStreak - sA.currentStreak;
  });

  sortedRoutines.forEach(rt => {
    const { currentStreak, maxStreak } = calculateStreak(rt, state.completions, todayStr);
    const color = CATEGORY_COLORS[rt.category] || '#00f0ff';

    const card = document.createElement('div');
    card.className = 'routine-streak-item';
    card.style.borderLeft = `3px solid ${color}`;
    
    card.innerHTML = `
      <div class="routine-streak-meta">
        <h4 class="routine-streak-name">${rt.name}</h4>
        <span class="streak-max-sub">MAX STREAK: ${maxStreak} DAYS</span>
      </div>
      <div class="routine-streak-flame">
        <span class="flame-badge ${currentStreak > 0 ? '' : 'hidden'}" style="${currentStreak > 0 ? '' : 'display:none;'}">
          🔥 ${currentStreak}
        </span>
        <span style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase; font-family:var(--font-mono); display:${currentStreak === 0 ? 'inline-block' : 'none'}">
          No active streak
        </span>
      </div>
    `;

    streakContainer.appendChild(card);
  });
}

/**
 * Renders stats summary and progress bar at the top of the app
 */
export function renderTopBarStats(state) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDay = new Date().getDay();

  // 1. Calculate Daily Progress Bar
  const todayRoutines = state.routines.filter(r => r.days.includes(todayDay));
  const completedToday = (state.completions[todayStr] || []).filter(id => state.routines.some(r => r.id === id));

  const countScheduled = todayRoutines.length;
  const countCompleted = completedToday.length;

  const bar = document.getElementById('today-progress');
  const ratioLabel = document.getElementById('today-completion-ratio');

  ratioLabel.textContent = `${countCompleted}/${countScheduled}`;

  const percentage = countScheduled > 0 ? Math.round((countCompleted / countScheduled) * 100) : 0;
  bar.style.width = `${percentage}%`;

  if (percentage === 100 && countScheduled > 0) {
    bar.style.boxShadow = '0 0 15px var(--neon-green)';
  } else {
    bar.style.boxShadow = '0 0 8px var(--neon-green)';
  }

  // 2. Global Streak Calculation
  // Consecutives days looking backward from today where at least 1 task was completed
  let globalStreak = 0;
  let checkDate = new Date();
  let streakBroken = false;
  let isFirstCheck = true;

  while (!streakBroken) {
    const checkStr = checkDate.toISOString().split('T')[0];
    const completedOnDay = state.completions[checkStr] || [];
    
    // Count only currently valid routines completed
    const validComps = completedOnDay.filter(id => state.routines.some(r => r.id === id));
    const dayOfWeek = checkDate.getDay();
    const routinesScheduled = state.routines.filter(r => r.days.includes(dayOfWeek));

    if (validComps.length > 0) {
      globalStreak++;
    } else {
      // If it's today and they have scheduled routines but haven't completed any yet,
      // don't break the streak unless they completed nothing yesterday too.
      if (isFirstCheck && checkStr === todayStr && routinesScheduled.length > 0) {
        // Keep checking yesterday
      } else if (routinesScheduled.length === 0) {
        // If nothing was scheduled, a miss doesn't break the streak
      } else {
        streakBroken = true;
      }
    }

    isFirstCheck = false;
    checkDate.setDate(checkDate.getDate() - 1);
    
    // Safety exit
    if (globalStreak > 1000) break;
  }

  document.getElementById('global-streak-count').textContent = globalStreak;
  
  return {
    isAllClearToday: countScheduled > 0 && countCompleted === countScheduled
  };
}
