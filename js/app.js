/**
 * Main Application Orchestrator
 */
import { getStorageState, saveStorageState, exportStateToFile, importStateFromString, resetStateToMock, clearAllState } from './storage.js';
import { optimizeAllSchedules } from './scheduler.js';
import { renderTimeline, renderMatrix, renderStreaks, renderTopBarStats, renderYearGrid } from './ui.js';

// App State
let state = getStorageState();
let selectedDay = new Date().getDay(); // Default to today's day of week
let currentTab = 'view-timeline';

/**
 * Initialize application and bind events
 */
document.addEventListener('DOMContentLoaded', () => {
  initAppNavigation();
  initFormControls();
  initDataConsoleControls();
  initModalTriggers();
  
  // Register Service Worker for offline capability
  registerServiceWorker();

  // Populate target hour dropdown options (0 to 23)
  populateHourDropdowns();

  // Highlight today's button in slider
  highlightActiveDayBtn();

  // Run initial renders
  refreshAllUI();
});

/**
 * Service Worker Registration for PWA Standalone Mode
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('[Service Worker] Registered successfully', reg.scope))
        .catch(err => console.error('[Service Worker] Registration failed', err));
    });
  }
}

/**
 * Refresh all views and stats based on current state
 */
function refreshAllUI() {
  // Update Top Stats & progress bars
  const { isAllClearToday } = renderTopBarStats(state);
  
  // Render active panels based on navigation selection
  if (currentTab === 'view-timeline') {
    renderTimeline(selectedDay, state, handleToggleCompletion, handleOpenEditModal);
  } else if (currentTab === 'view-matrix') {
    renderMatrix(selectedDay, state, handleOpenEditModal);
  } else if (currentTab === 'view-streaks') {
    const isYearGridActive = document.getElementById('btn-toggle-yeargrid').classList.contains('active');
    if (isYearGridActive) {
      renderYearGrid(state);
    } else {
      renderStreaks(state);
    }
  }
  
  // Check if daily routines completed for a celebratory overlay trigger
  const celebrationShown = localStorage.getItem('aether_today_celebration_clear');
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (isAllClearToday && celebrationShown !== todayStr) {
    document.getElementById('confetti-screen').classList.add('active');
    localStorage.setItem('aether_today_celebration_clear', todayStr);
  }
}

/**
 * Highlight selected day button in navigation slider
 */
function highlightActiveDayBtn() {
  document.querySelectorAll('.day-btn').forEach(btn => {
    const btnDay = parseInt(btn.getAttribute('data-day'), 10);
    if (btnDay === selectedDay) {
      btn.classList.add('active');
      // Scroll day navigation slider if needed
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      btn.classList.remove('active');
    }
  });

  // Update subtitle
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  document.getElementById('selected-day-label').textContent = `${dayNames[selectedDay]} Routines`;
}

/**
 * Initialize Bottom Tabs and Day Navigation Slider clicks
 */
function initAppNavigation() {
  // 1. Bottom tab buttons
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-target');
      currentTab = target;

      // Update active nav class
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active view class
      document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
      document.getElementById(target).classList.add('active');

      refreshAllUI();
    });
  });

  // 2. Day navigation slider buttons
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDay = parseInt(btn.getAttribute('data-day'), 10);
      highlightActiveDayBtn();
      refreshAllUI();
    });
  });

  // 3. Dismiss Celebration overlay
  document.getElementById('btn-dismiss-celebration').addEventListener('click', () => {
    document.getElementById('confetti-screen').classList.remove('active');
  });

  // 4. Year Grid Toggle Buttons inside Streaks Tab
  const btnHeatmap = document.getElementById('btn-toggle-heatmap');
  const btnYearGrid = document.getElementById('btn-toggle-yeargrid');
  const viewHeatmap = document.getElementById('streaks-heatmap-view');
  const viewYearGrid = document.getElementById('streaks-yeargrid-view');

  if (btnHeatmap && btnYearGrid) {
    btnHeatmap.addEventListener('click', () => {
      btnHeatmap.classList.add('active');
      btnYearGrid.classList.remove('active');
      viewHeatmap.classList.add('active');
      viewYearGrid.classList.remove('active');
      refreshAllUI();
    });

    btnYearGrid.addEventListener('click', () => {
      btnYearGrid.classList.add('active');
      btnHeatmap.classList.remove('active');
      viewYearGrid.classList.add('active');
      viewHeatmap.classList.remove('active');
      refreshAllUI();
    });
  }
}

/**
 * Handle routine completion toggle
 */
function handleToggleCompletion(routineId) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (!state.completions[todayStr]) {
    state.completions[todayStr] = [];
  }

  const completedList = state.completions[todayStr];
  const index = completedList.indexOf(routineId);

  if (index > -1) {
    completedList.splice(index, 1); // remove completion
  } else {
    completedList.push(routineId);  // add completion
  }

  saveStorageState(state);
  refreshAllUI();
}

/**
 * Populates target hour choices in modal form
 */
function populateHourDropdowns() {
  const select = document.getElementById('form-target-hour');
  select.innerHTML = '';

  for (let i = 0; i < 24; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${i.toString().padStart(2, '0')}:00`;
    select.appendChild(option);
  }
}

/**
 * Setup range slider badging updates and form submit bindings
 */
function initFormControls() {
  const energySlider = document.getElementById('form-energy');
  const energyBadge = document.getElementById('energy-badge');
  energySlider.addEventListener('input', () => {
    energyBadge.textContent = energySlider.value;
  });

  const prioritySlider = document.getElementById('form-priority');
  const priorityBadge = document.getElementById('priority-badge');
  prioritySlider.addEventListener('input', () => {
    priorityBadge.textContent = prioritySlider.value;
  });

  // Form submission handler
  const form = document.getElementById('routine-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const routineId = document.getElementById('form-routine-id').value;
    
    // Retrieve day checks
    const activeDays = [];
    document.querySelectorAll('.day-checkbox:checked').forEach(cb => {
      activeDays.push(parseInt(cb.value, 10));
    });

    if (activeDays.length === 0) {
      alert("Please select at least one active day of the week.");
      return;
    }

    const payload = {
      id: routineId || `rt_${Math.random().toString(36).substr(2, 9)}`,
      name: document.getElementById('form-name').value,
      category: document.getElementById('form-category').value,
      conflictGroup: document.getElementById('form-conflict-group').value.trim(),
      energy: parseInt(energySlider.value, 10),
      priority: parseInt(prioritySlider.value, 10),
      duration: parseInt(document.getElementById('form-duration').value, 10),
      targetHour: parseInt(document.getElementById('form-target-hour').value, 10),
      preferredBlock: document.getElementById('form-preferred-block').value,
      days: activeDays
    };

    if (routineId) {
      // Modify existing
      const index = state.routines.findIndex(r => r.id === routineId);
      if (index > -1) {
        state.routines[index] = payload;
      }
    } else {
      // Create new
      state.routines.push(payload);
    }

    saveStorageState(state);
    refreshAllUI();
    closeRoutineModal();
  });

  // Delete button click
  document.getElementById('btn-delete-routine').addEventListener('click', () => {
    const routineId = document.getElementById('form-routine-id').value;
    if (routineId && confirm("Are you sure you want to delete this routine?")) {
      // Remove from list
      state.routines = state.routines.filter(r => r.id !== routineId);
      
      // Clean completion listings as well
      Object.keys(state.completions).forEach(d => {
        state.completions[d] = state.completions[d].filter(id => id !== routineId);
      });

      saveStorageState(state);
      refreshAllUI();
      closeRoutineModal();
    }
  });
}

/**
 * Setup modals trigger events (Open modal, close overlay clicks)
 */
function initModalTriggers() {
  const modal = document.getElementById('routine-modal');
  
  // Open modal button
  document.getElementById('btn-open-add-modal').addEventListener('click', () => {
    handleOpenAddModal();
  });

  // Close buttons
  document.getElementById('btn-close-modal').addEventListener('click', closeRoutineModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeRoutineModal();
    }
  });
}

function handleOpenAddModal() {
  const modal = document.getElementById('routine-modal');
  document.getElementById('modal-title').textContent = "Configure Routine";
  document.getElementById('form-routine-id').value = "";
  
  // Reset fields
  document.getElementById('form-name').value = "";
  document.getElementById('form-category').value = "Academics";
  document.getElementById('form-conflict-group').value = "";
  document.getElementById('form-energy').value = "3";
  document.getElementById('energy-badge').textContent = "3";
  document.getElementById('form-priority').value = "3";
  document.getElementById('priority-badge').textContent = "3";
  document.getElementById('form-duration').value = "60";
  document.getElementById('form-target-hour').value = "9";
  document.getElementById('form-preferred-block').value = "morning";
  
  // Set day checkboxes default (current day selected)
  document.querySelectorAll('.day-checkbox').forEach(cb => {
    cb.checked = (parseInt(cb.value, 10) === selectedDay);
  });

  document.getElementById('btn-delete-routine').classList.add('hidden');
  modal.classList.add('active');
}

function handleOpenEditModal(routine) {
  const modal = document.getElementById('routine-modal');
  document.getElementById('modal-title').textContent = "Modify Routine";
  document.getElementById('form-routine-id').value = routine.id;
  
  // Hydrate fields
  document.getElementById('form-name').value = routine.name;
  document.getElementById('form-category').value = routine.category;
  document.getElementById('form-conflict-group').value = routine.conflictGroup || "";
  document.getElementById('form-energy').value = routine.energy;
  document.getElementById('energy-badge').textContent = routine.energy;
  document.getElementById('form-priority').value = routine.priority;
  document.getElementById('priority-badge').textContent = routine.priority;
  document.getElementById('form-duration').value = routine.duration;
  document.getElementById('form-target-hour').value = routine.targetHour;
  document.getElementById('form-preferred-block').value = routine.preferredBlock;
  
  // Hydrate day checks
  document.querySelectorAll('.day-checkbox').forEach(cb => {
    cb.checked = routine.days.includes(parseInt(cb.value, 10));
  });

  document.getElementById('btn-delete-routine').classList.remove('hidden');
  modal.classList.add('active');
}

function closeRoutineModal() {
  document.getElementById('routine-modal').classList.remove('active');
}

/**
 * Matrix Optimization Action Engine
 */
function initDataConsoleControls() {
  // 1. Matrix solver trigger
  document.getElementById('btn-run-optimizer').addEventListener('click', () => {
    const optimizedRoutines = optimizeAllSchedules(state.routines);
    state.routines = optimizedRoutines;
    saveStorageState(state);
    refreshAllUI();
    
    // UI Flash Alert indicating optimization complete
    const btn = document.getElementById('btn-run-optimizer');
    const origText = btn.innerHTML;
    btn.innerHTML = '✨ SOLVED & SAVED!';
    btn.style.borderColor = 'var(--neon-green)';
    btn.style.color = 'var(--neon-green)';
    btn.style.boxShadow = '0 0 20px var(--neon-green)';
    
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.boxShadow = '';
    }, 1500);
  });

  // 2. Export state trigger
  document.getElementById('btn-export-json').addEventListener('click', () => {
    exportStateToFile();
  });

  // 3. Trigger hidden file input click
  const fileInput = document.getElementById('import-file-input');
  const statusLabel = document.getElementById('import-status-label');

  document.getElementById('btn-trigger-upload').addEventListener('click', () => {
    fileInput.click();
  });

  // 4. File input change (Imports JSON)
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importStateFromString(event.target.result);
      if (result.success) {
        state = getStorageState();
        refreshAllUI();
        statusLabel.textContent = `✓ Successfully restored ${result.count} routines!`;
        statusLabel.className = 'import-status-text text-accent-green';
      } else {
        statusLabel.textContent = `⚠️ Load Error: ${result.error}`;
        statusLabel.className = 'import-status-text text-accent-pink';
      }
      
      // Clear file input value to trigger on same file next time
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  // 5. Restore default factory mock data
  document.getElementById('btn-restore-mock').addEventListener('click', () => {
    if (confirm("Reset current database to the university optimization mock dataset? All completions from the past 14 days will be restored to match.")) {
      state = resetStateToMock();
      refreshAllUI();
      alert("Successfully restored factory dummy configurations.");
    }
  });

  // 6. Hard clear database WIPE
  document.getElementById('btn-clear-database').addEventListener('click', () => {
    if (confirm("⚠️ DANGER WIPE: Irreversibly erase ALL routines and completions? This action cannot be undone.")) {
      state = clearAllState();
      refreshAllUI();
      alert("Complete local database successfully cleared.");
    }
  });
}
