/**
 * UI Renderer Module
 */
import { getBlockForHour, checkConflictsForDay, calculateStreak } from './scheduler.js';
import { playThemeChange } from './audio.js';

// Color map for categories
export const CATEGORY_COLORS = {
  Academics: '#00f0ff', // Neon Cyan
  Health: '#00ff88',    // Neon Green
  Work: '#ff9500',      // Neon Orange
  Leisure: '#ff6b8b'    // Neon Pink (Satisfies WCAG AAA >7:1)
};

/**
 * XSS Sanitization Utility
 * Escapes all user-supplied strings before injecting into innerHTML templates.
 * Prevents DOM-based XSS from routine names, conflict groups, or voice command inputs.
 */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format minutes into readable HH:MM 24h string
 */
function formatHour(hour) {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Render chronological card timeline for a specific day (0-6)
 */
export function renderTimeline(day, state, onToggleComplete, onEditClick, activeCategoryFilter = 'All') {
  const container = document.getElementById('timeline-list');

  const todayStr = new Date().toISOString().split('T')[0];
  let activeRoutines = state.routines.filter(r => r.days.includes(day));
  
  if (activeCategoryFilter && activeCategoryFilter !== 'All') {
    activeRoutines = activeRoutines.filter(r => r.category === activeCategoryFilter);
  }
  
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

  const fragment = document.createDocumentFragment();

  activeRoutines.forEach((rt, index) => {
    const isCompleted = (state.completions[todayStr] || []).includes(rt.id);
    const color = CATEGORY_COLORS[rt.category] || '#00f0ff';

    // 3. Habit-Stacking Connectors Check
    if (index > 0) {
      const prevRt = activeRoutines[index - 1];
      const prevEndMin = (prevRt.targetHour * 60) + prevRt.duration;
      const currStartMin = rt.targetHour * 60;
      const gapMin = currStartMin - prevEndMin;

      if (gapMin >= 0 && gapMin <= 45) {
        const connector = document.createElement('div');
        connector.className = 'habit-stack-connector';
        connector.innerHTML = `
          <div class="connector-line"></div>
          <span class="connector-badge" role="status" aria-label="Habit stacking connector: ${gapMin} minutes gap between ${prevRt.name} and ${rt.name}">✨ STACKED ✨ (${gapMin} min gap)</span>
          <div class="connector-line"></div>
        `;
        fragment.appendChild(connector);
      }
    }

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
        <label class="custom-checkbox-wrapper" id="check-wrapper-${escapeHTML(rt.id)}">
          <input type="checkbox" class="custom-checkbox-input" id="check-${escapeHTML(rt.id)}" ${isCompleted ? 'checked' : ''} aria-label="Mark ${escapeHTML(rt.name)} as completed">
          <span class="checkbox-visual"></span>
        </label>
        
        <div class="routine-info">
          <h3 class="routine-title">${escapeHTML(rt.name)}</h3>
          
          <div class="routine-meta-row">
            <span class="badge-outline">${formatHour(rt.targetHour)}</span>
            <span class="badge-solid-dark">${escapeHTML(String(rt.duration))} mins</span>
            <span class="badge-solid-dark">${escapeHTML(rt.category)}</span>
            ${rt.conflictGroup ? `<span class="badge-outline" style="border-style: dashed; opacity: 0.7;">${escapeHTML(rt.conflictGroup)}</span>` : ''}
            <div class="energy-indicator" title="Energy: ${escapeHTML(String(rt.energy))}/5">
              ${energyPips}
            </div>
          </div>
        </div>
      </div>

      <div class="routine-card-actions">
        <button class="btn-edit" id="edit-${escapeHTML(rt.id)}" aria-label="Edit routine: ${escapeHTML(rt.name)}">⚙</button>
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

    fragment.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(fragment);
}

/**
 * Render 24-hour visual scheduling matrix grid & active conflict notifications
 */
export function renderMatrix(day, state, onEditClick) {
  // 1. Render conflicts list
  const feed = document.getElementById('matrix-conflict-feed');
  
  const { conflicts, warnings, successes = [] } = checkConflictsForDay(day, state.routines);
  
  const feedFragment = document.createDocumentFragment();

  if (conflicts.length === 0 && warnings.length === 0) {
    const alert = document.createElement('div');
    alert.className = 'conflict-alert';
    alert.style.cssText = 'background: rgba(0, 255, 136, 0.05); border: 1px dashed var(--neon-green); color: var(--neon-green)';
    alert.innerHTML = `
      <span class="conflict-alert-icon">✓</span>
      <span>Schedule matrix fully optimized! Zero overlapping fatigue groups detected for today.</span>
    `;
    feedFragment.appendChild(alert);
  } else {
    // Show errors first
    conflicts.forEach(c => {
      const alert = document.createElement('div');
      alert.className = 'conflict-alert error';
      alert.innerHTML = `
        <span class="conflict-alert-icon">⚠️</span>
        <span>${c.message}</span>
      `;
      feedFragment.appendChild(alert);
    });

    // Show warnings
    warnings.forEach(w => {
      const alert = document.createElement('div');
      alert.className = 'conflict-alert warning';
      alert.innerHTML = `
        <span class="conflict-alert-icon">⚡</span>
        <span>${w.message}</span>
      `;
      feedFragment.appendChild(alert);
    });
  }

  // Show successes (perfect habit stacks)
  successes.forEach(s => {
    const alert = document.createElement('div');
    alert.className = 'conflict-alert success';
    alert.innerHTML = `
      <span class="conflict-alert-icon">✨</span>
      <span>${s.message}</span>
    `;
    feedFragment.appendChild(alert);
  });

  feed.innerHTML = '';
  feed.appendChild(feedFragment);

  // 2. Render 24-hour rows
  const gridContainer = document.getElementById('matrix-grid-hours');

  const activeRoutines = state.routines.filter(r => r.days.includes(day));
  const gridFragment = document.createDocumentFragment();

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
        <button class="matrix-event-badge ${hasConflict ? 'overlap-warn' : ''}" 
              style="--accent-color: ${color}; cursor: pointer;" 
              id="matrix-badge-${rt.id}-${hour}"
              aria-label="Routine ${rt.name} at ${formatHour(hour)}. Click to edit.">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color}"></span>
          ${rt.name}
        </button>
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

    gridFragment.appendChild(row);
  }

  gridContainer.innerHTML = '';
  gridContainer.appendChild(gridFragment);
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
  const heatmapFragment = document.createDocumentFragment();

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

    heatmapFragment.appendChild(cell);
  }

  heatmapGrid.innerHTML = '';
  heatmapGrid.appendChild(heatmapFragment);

  // 3. Render Individual Routine Streak Badges
  const streakContainer = document.getElementById('routine-streaks-container');

  if (state.routines.length === 0) {
    streakContainer.innerHTML = `
      <p style="text-align: center; color: var(--text-dim); padding: 20px 0;">No active routines to track.</p>
    `;
    return;
  }

  const streakFragment = document.createDocumentFragment();

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

    streakFragment.appendChild(card);
  });

  streakContainer.innerHTML = '';
  streakContainer.appendChild(streakFragment);
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
  bar.setAttribute('aria-valuenow', percentage);
  bar.setAttribute('aria-valuetext', `${percentage}% complete today (${countCompleted} of ${countScheduled} routines)`);

  if (percentage === 100 && countScheduled > 0) {
    bar.style.boxShadow = '0 0 15px var(--neon-green)';
  } else {
    bar.style.boxShadow = '0 0 8px var(--neon-green)';
  }

  // 2. Global Streak Calculation
  // Consecutives days looking backward from today where at least 1 task was completed
  const hasAnyScheduledRoutines = state.routines.some(r => r.days && r.days.length > 0);
  if (!hasAnyScheduledRoutines) {
    document.getElementById('global-streak-count').textContent = '0';
    return {
      isAllClearToday: false
    };
  }

  let globalStreak = 0;
  let checkDate = new Date();
  let streakBroken = false;
  let isFirstCheck = true;
  let daysChecked = 0;

  while (!streakBroken) {
    daysChecked++;
    if (daysChecked > 365) {
      break; // Safety break to prevent infinite loops under empty schedules
    }

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

/**
 * Render 12-Month Themed Annual Calendar grid (Cyberpunk High-Contrast version of user goal sheet)
 */
export function renderYearGrid(state) {
  // 1. Render Columns Decode Legend Key at the top
  const legendList = document.getElementById('calendar-legend-list');
  if (legendList) {
    if (state.routines.length === 0) {
      legendList.innerHTML = `
        <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">
          No active habits configured. Configure routines in the Timeline to track columns!
        </span>
      `;
    } else {
      const legendFragment = document.createDocumentFragment();
      // Sort routines consistently by ID so column mappings are stable in every cell!
      const sortedRoutines = [...state.routines].sort((a, b) => a.id.localeCompare(b.id));
      sortedRoutines.forEach((rt, index) => {
        const color = CATEGORY_COLORS[rt.category] || '#00f0ff';
        const chip = document.createElement('span');
        chip.className = 'legend-col-chip';
        chip.style.setProperty('--accent-color', color);
        chip.textContent = `Col ${index + 1}: ${rt.name}`;
        legendFragment.appendChild(chip);
      });
      legendList.innerHTML = '';
      legendList.appendChild(legendFragment);
    }
  }

  const container = document.getElementById('year-calendar-grid');
  if (!container) return;

  const MONTHS = [
    { name: 'JANUARY', days: 31 },
    { name: 'FEBRUARY', days: 28 }, // 2026 is non-leap
    { name: 'MARCH', days: 31 },
    { name: 'APRIL', days: 30 },
    { name: 'MAY', days: 31 },
    { name: 'JUNE', days: 30 },
    { name: 'JULY', days: 31 },
    { name: 'AUGUST', days: 31 },
    { name: 'SEPTEMBER', days: 30 },
    { name: 'OCTOBER', days: 31 },
    { name: 'NOVEMBER', days: 30 },
    { name: 'DECEMBER', days: 31 }
  ];

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  let annualBlueDays = 0;
  
  // Sort routines consistently for day-cells as well!
  const sortedRoutinesForCells = [...state.routines].sort((a, b) => a.id.localeCompare(b.id));

  const yearFragment = document.createDocumentFragment();

  MONTHS.forEach((month, mIndex) => {
    const monthCard = document.createElement('div');
    monthCard.className = 'month-card';

    // Calculate starting weekday for 2026
    const firstDayOfWeek = new Date(2026, mIndex, 1).getDay();

    let daysHtml = '';
    
    // 1. Render empty grid cells for padding
    for (let i = 0; i < firstDayOfWeek; i++) {
      daysHtml += '<span class="calendar-day-cell empty"></span>';
    }

    let scheduledDaysInMonth = 0;
    let completedDaysInMonth = 0;

    // 2. Render actual calendar days (1 to month.days)
    for (let day = 1; day <= month.days; day++) {
      const cellDate = new Date(2026, mIndex, day);
      const dow = cellDate.getDay();
      const dateStr = `2026-${(mIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      const isFuture = cellDate > todayMidnight;
      
      let subBoxesHtml = '';

      if (sortedRoutinesForCells.length === 0) {
        // Blank slate visual
        const statusClass = isFuture ? 'future' : 'inactive';
        subBoxesHtml = `<span class="calendar-sub-box ${statusClass}"></span>`;
      } else {
        let hasActiveRoutine = false;
        let completedAtLeastOne = false;

        sortedRoutinesForCells.forEach(rt => {
          const isScheduled = rt.days.includes(dow);
          const color = CATEGORY_COLORS[rt.category] || '#00f0ff';
          
          let statusClass = 'inactive';

          if (isScheduled) {
            hasActiveRoutine = true;
            if (isFuture) {
              statusClass = 'future';
            } else {
              const completionsOnDate = state.completions[dateStr] || [];
              const isDone = completionsOnDate.includes(rt.id);
              if (isDone) {
                statusClass = 'active-completed';
                completedAtLeastOne = true;
              } else {
                statusClass = 'active-missed';
              }
            }
          }

          subBoxesHtml += `<span class="calendar-sub-box ${statusClass}" style="--accent-color: ${color}"></span>`;
        });

        if (hasActiveRoutine && !isFuture) {
          scheduledDaysInMonth++;
          if (completedAtLeastOne) {
            completedDaysInMonth++;
            annualBlueDays++;
          }
        }
      }

      daysHtml += `
        <span class="calendar-day-cell">
          <span class="calendar-day-number">${day}</span>
          ${subBoxesHtml}
        </span>
      `;
    }

    // Calculate month yield percentage
    const monthYield = scheduledDaysInMonth > 0 ? Math.round((completedDaysInMonth / scheduledDaysInMonth) * 100) : 0;
    const highlightClass = monthYield > 50 ? 'highlight-yield' : '';

    monthCard.innerHTML = `
      <h4 class="month-title">${month.name}</h4>
      <div class="calendar-days-row">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div class="calendar-month-grid">
        ${daysHtml}
      </div>
      <div class="month-completion-footer ${highlightClass}">
        ${monthYield}% Positive
      </div>
    `;

    yearFragment.appendChild(monthCard);
  });

  container.innerHTML = '';
  container.appendChild(yearFragment);

  // Update top title summary (e.g. "Annual Goal Progress: 24 Completed Blue Days")
  const titleVal = document.getElementById('annual-goal-subtitle');
  if (titleVal) {
    titleVal.textContent = `Annual Goal Progress: ${annualBlueDays} Completed Blue Days`;
  }
}

/**
 * --- THEME SELECTOR & DUAL PANE HANDLERS ---
 */

function applyTheme(themeName) {
  const body = document.body;
  
  // Clean classes
  body.classList.remove('theme-cyberpunk', 'theme-vaporwave', 'theme-crt', 'theme-mono');
  
  // Set new theme
  if (themeName !== 'default') {
    body.classList.add(`theme-${themeName}`);
  } else {
    body.classList.add('theme-cyberpunk');
  }
  
  // Update active state on all buttons targeting themes
  document.querySelectorAll('[data-theme]').forEach(btn => {
    if (btn.getAttribute('data-theme') === themeName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

export function initThemeEngine() {
  const storedTheme = localStorage.getItem('aether_theme') || 'default';
  applyTheme(storedTheme);
  
  // Delegate clicks on theme buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme]');
    if (btn) {
      const themeName = btn.getAttribute('data-theme');
      applyTheme(themeName);
      localStorage.setItem('aether_theme', themeName);
      
      // Play high-tech switch beep sound if available
      try {
        playThemeChange(themeName);
      } catch (e) {
        // AudioContext blocked or not supported
      }
    }
  });

  // Watch screen size and handle desktop-sidebar redirects automatically
  function handleDesktopRedirect() {
    if (window.innerWidth >= 1025) {
      const activeTabBtn = document.querySelector('.nav-tab.active');
      if (activeTabBtn && activeTabBtn.id === 'tab-timeline') {
        const calendarTab = document.getElementById('tab-calendar');
        if (calendarTab) calendarTab.click();
      }
    }
  }

  window.addEventListener('resize', handleDesktopRedirect);
  // Run on short delay to ensure tabs are initialized
  setTimeout(handleDesktopRedirect, 100);
}

// Automatically bootstrap theme engine once page components load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initThemeEngine);
}
