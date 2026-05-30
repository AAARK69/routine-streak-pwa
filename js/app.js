/**
 * Main Application Orchestrator
 */
import { getStorageState, saveStorageState, exportStateToFile, importStateFromString, resetStateToMock, clearAllState } from './storage.js';
import { optimizeAllSchedules } from './scheduler.js';
import { renderTimeline, renderMatrix, renderStreaks, renderTopBarStats, renderYearGrid } from './ui.js';
import { playClick, playChime, playSweep, toggleMute, isMuted } from './audio.js';

// App State
let state = { routines: [], completions: {} };
let selectedDay = new Date().getDay(); // Default to today's day of week
let currentTab = 'view-calendar';
let lastActiveElement = null; // WCAG AAA Keyboard Focus Return tracking

/**
 * Initialize application and bind events
 */
document.addEventListener('DOMContentLoaded', async () => {
  initAudioControls();
  initAppNavigation();
  initFormControls();
  initDataConsoleControls();
  initModalTriggers();
  
  // Register Service Worker for offline capability
  registerServiceWorker();

  // Populate target hour dropdown options (0 to 23)
  populateHourDropdowns();

  // Load initial state asynchronously from IndexedDB (with migration)
  state = await getStorageState();

  // Set up BroadcastChannel listener for cross-tab synchronization
  if ('BroadcastChannel' in window) {
    const syncChannel = new BroadcastChannel('aether_state_sync');
    syncChannel.onmessage = async (event) => {
      if (event.data && event.data.type === 'STATE_UPDATED') {
        console.log('[App Sync] State updated in another tab. Reloading and rendering...');
        state = await getStorageState();
        refreshAllUI();
      }
    };
  }

  // Highlight today's button in slider
  highlightActiveDayBtn();

  // Initialize Web Speech dictation system
  initVoiceDictation();

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
    renderStreaks(state);
  } else if (currentTab === 'view-calendar') {
    renderYearGrid(state);
  }
  
  // Check if daily routines completed for a celebratory overlay trigger
  const celebrationShown = localStorage.getItem('aether_today_celebration_clear');
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (isAllClearToday && celebrationShown !== todayStr) {
    document.getElementById('confetti-screen').classList.add('active');
    localStorage.setItem('aether_today_celebration_clear', todayStr);
    playSweep(); // Immersive milestone sweep celebration
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
      btn.setAttribute('aria-selected', 'true');
      // Scroll day navigation slider if needed
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
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

      // Update active nav class and ARIA selected status
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Update active view class
      document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
      document.getElementById(target).classList.add('active');

      playClick();
      refreshAllUI();
    });
  });

  // 2. Day navigation slider buttons
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDay = parseInt(btn.getAttribute('data-day'), 10);
      highlightActiveDayBtn();
      playClick();
      refreshAllUI();
    });
  });

  // 3. Dismiss Celebration overlay
  document.getElementById('btn-dismiss-celebration').addEventListener('click', () => {
    playClick();
    document.getElementById('confetti-screen').classList.remove('active');
  });
}

/**
 * Handle routine completion toggle
 */
async function handleToggleCompletion(routineId) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (!state.completions[todayStr]) {
    state.completions[todayStr] = [];
  }

  const completedList = state.completions[todayStr];
  const index = completedList.indexOf(routineId);

  if (index > -1) {
    completedList.splice(index, 1); // remove completion
    playClick();
  } else {
    completedList.push(routineId);  // add completion
    playChime(); // Rising completion major chord
  }

  await saveStorageState(state);
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
    playClick();
  });

  const prioritySlider = document.getElementById('form-priority');
  const priorityBadge = document.getElementById('priority-badge');
  prioritySlider.addEventListener('input', () => {
    priorityBadge.textContent = prioritySlider.value;
    playClick();
  });

  // Form submission handler
  const form = document.getElementById('routine-form');
  form.addEventListener('submit', async (e) => {
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
      playClick();
    } else {
      // Create new
      state.routines.push(payload);
      playChime();
    }

    await saveStorageState(state);
    refreshAllUI();
    closeRoutineModal();
  });

  // Delete button click
  document.getElementById('btn-delete-routine').addEventListener('click', async () => {
    const routineId = document.getElementById('form-routine-id').value;
    if (routineId && confirm("Are you sure you want to delete this routine?")) {
      // Remove from list
      state.routines = state.routines.filter(r => r.id !== routineId);
      
      // Clean completion listings as well
      Object.keys(state.completions).forEach(d => {
        state.completions[d] = state.completions[d].filter(id => id !== routineId);
      });

      playClick();
      await saveStorageState(state);
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
    playClick();
    handleOpenAddModal();
  });

  // Close buttons
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    playClick();
    closeRoutineModal();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      playClick();
      closeRoutineModal();
    }
  });
}

function handleOpenAddModal() {
  lastActiveElement = document.activeElement;
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

  // WCAG AAA Keyboard focus management: send focus to Name input
  setTimeout(() => {
    document.getElementById('form-name').focus();
  }, 100);
}

function handleOpenEditModal(routine) {
  lastActiveElement = document.activeElement;
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

  // WCAG AAA Keyboard focus management: send focus to Name input
  setTimeout(() => {
    document.getElementById('form-name').focus();
  }, 100);
}

function closeRoutineModal() {
  document.getElementById('routine-modal').classList.remove('active');
  
  // WCAG AAA Keyboard Focus Return
  if (lastActiveElement) {
    lastActiveElement.focus();
  }
}

/**
 * Matrix Optimization Action Engine
 */
function initDataConsoleControls() {
  // 1. Matrix solver trigger
  document.getElementById('btn-run-optimizer').addEventListener('click', async () => {
    const optimizedRoutines = optimizeAllSchedules(state.routines);
    state.routines = optimizedRoutines;
    await saveStorageState(state);
    refreshAllUI();
    playSweep(); // Play successful sweep pad
    
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
  document.getElementById('btn-export-json').addEventListener('click', async () => {
    playClick();
    await exportStateToFile();
  });

  // 3. Trigger hidden file input click
  const fileInput = document.getElementById('import-file-input');
  const statusLabel = document.getElementById('import-status-label');

  document.getElementById('btn-trigger-upload').addEventListener('click', () => {
    playClick();
    fileInput.click();
  });

  // 4. File input change (Imports JSON)
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = await importStateFromString(event.target.result);
      if (result.success) {
        state = await getStorageState();
        refreshAllUI();
        playSweep(); // Play successful sweep pad
        statusLabel.textContent = `✓ Merged: ${result.addedCount} new routines added, ${result.mergedCount} updated, and ${result.completionsCount} completions merged!`;
        statusLabel.className = 'import-status-text text-accent-green';
      } else {
        statusLabel.textContent = `⚠️ Load Error: ${result.error}`;
        statusLabel.className = 'import-status-text text-accent-pink';
        playClick();
      }
      
      // Clear file input value to trigger on same file next time
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  // 5. Restore default factory mock data
  document.getElementById('btn-restore-mock').addEventListener('click', async () => {
    if (confirm("Reset current database to the university optimization mock dataset? All completions from the past 14 days will be restored to match.")) {
      state = await resetStateToMock();
      refreshAllUI();
      playSweep();
      alert("Successfully restored factory dummy configurations.");
    }
  });

  // 6. Hard clear database WIPE
  document.getElementById('btn-clear-database').addEventListener('click', async () => {
    if (confirm("⚠️ DANGER WIPE: Irreversibly erase ALL routines and completions? This action cannot be undone.")) {
      state = await clearAllState();
      refreshAllUI();
      playClick();
      alert("Complete local database successfully cleared.");
    }
  });
}

/**
 * Audio control mute UI triggers
 */
function initAudioControls() {
  const toggleBtn = document.getElementById('btn-audio-toggle');
  if (!toggleBtn) return;
  
  const updateUI = () => {
    const muted = isMuted();
    if (muted) {
      toggleBtn.classList.add('muted');
      toggleBtn.textContent = '🔇';
    } else {
      toggleBtn.classList.remove('muted');
      toggleBtn.textContent = '🔊';
    }
  };

  updateUI();

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMute();
    updateUI();
  });
}

/**
 * 🎤 WEB SPEECH DICTATION & VOICE PARSER ENGINE
 */
function initVoiceDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const globalVoiceBtn = document.getElementById('btn-global-voice');
  const inlineVoiceBtn = document.getElementById('btn-voice-dictate');
  const voiceOverlay = document.getElementById('voice-listening-overlay');
  const voiceStatus = document.getElementById('voice-listening-status');
  const cancelVoiceBtn = document.getElementById('btn-cancel-voice');

  if (!SpeechRecognition) {
    if (globalVoiceBtn) globalVoiceBtn.style.display = 'none';
    if (inlineVoiceBtn) inlineVoiceBtn.style.display = 'none';
    console.warn("Web Speech API is not supported in this browser environment.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let activeMode = 'global'; // 'global' or 'inline'

  recognition.onstart = () => {
    voiceOverlay.style.display = 'flex';
    voiceOverlay.setAttribute('aria-hidden', 'false');
    
    if (cancelVoiceBtn) cancelVoiceBtn.focus();

    if (activeMode === 'global') {
      voiceStatus.textContent = 'Say a command, e.g., "Add Chemistry Class on Mon Wed Fri at 2 PM for 50 minutes"';
    } else {
      voiceStatus.textContent = 'Dictate the name of your routine, e.g., "Advanced Biology Lab"';
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition engine error:", e.error);
    if (e.error === 'not-allowed') {
      voiceStatus.textContent = '⚠️ Microphone access blocked. Check permission settings.';
    } else {
      voiceStatus.textContent = '⚠️ Error hearing speech. Please speak clearly.';
    }
    setTimeout(closeVoiceOverlay, 2500);
  };

  recognition.onend = () => {
    // Keep overlay open until processed
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    voiceStatus.textContent = `Recognized: "${transcript}"`;
    
    setTimeout(() => {
      closeVoiceOverlay();
      if (activeMode === 'global') {
        parseAndApplyVoiceCommand(transcript);
      } else {
        document.getElementById('form-name').value = transcript;
        document.getElementById('form-name').focus();
      }
    }, 1200);
  };

  function startListening(mode) {
    activeMode = mode;
    lastActiveElement = document.activeElement;
    try {
      recognition.start();
    } catch (err) {
      console.error("Speech engine start error:", err);
    }
  }

  function closeVoiceOverlay() {
    voiceOverlay.style.display = 'none';
    voiceOverlay.setAttribute('aria-hidden', 'true');
    recognition.stop();
    
    if (lastActiveElement) {
      lastActiveElement.focus();
    }
  }

  if (globalVoiceBtn) {
    globalVoiceBtn.addEventListener('click', () => {
      startListening('global');
    });
  }

  if (inlineVoiceBtn) {
    inlineVoiceBtn.addEventListener('click', () => {
      startListening('inline');
    });
  }

  if (cancelVoiceBtn) {
    cancelVoiceBtn.addEventListener('click', closeVoiceOverlay);
  }
}

/**
 * Parses spoken phrases into structured Routine schema properties
 */
function parseAndApplyVoiceCommand(text) {
  text = text.toLowerCase();
  
  // 1. Parse Name (look for "add [Name]" or words before key parameters)
  let name = "";
  const addMatch = text.match(/add\s+(.+?)(?=\s+(at|for|on|category)\b|$)/i);
  if (addMatch && addMatch[1]) {
    name = capitalizeWords(addMatch[1].trim());
  } else {
    const fallbackMatch = text.match(/^(.+?)(?=\s+(at|for|on|category)\b|$)/i);
    if (fallbackMatch && fallbackMatch[1]) {
      name = capitalizeWords(fallbackMatch[1].trim());
    } else {
      name = "Voice Routine";
    }
  }

  // 2. Parse Category (match triggers to predefined tokens)
  let category = "Academics"; // Default
  if (text.includes("health") || text.includes("gym") || text.includes("workout") || text.includes("run") || text.includes("exercise") || text.includes("meditation") || text.includes("yoga") || text.includes("sleep")) {
    category = "Health";
  } else if (text.includes("work") || text.includes("job") || text.includes("meeting") || text.includes("office") || text.includes("coding") || text.includes("project")) {
    category = "Work";
  } else if (text.includes("leisure") || text.includes("game") || text.includes("movie") || text.includes("play") || text.includes("chill") || text.includes("relax") || text.includes("fun") || text.includes("social")) {
    category = "Leisure";
  } else if (text.includes("academics") || text.includes("study") || text.includes("class") || text.includes("lecture") || text.includes("homework")) {
    category = "Academics";
  }

  // 3. Parse Duration (in minutes)
  let duration = 60; // Default
  const durationMatch = text.match(/for\s+(\d+)\s*(minute|minutes|hour|hours)/i);
  if (durationMatch) {
    const val = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith("hour")) {
      duration = val * 60;
    } else {
      duration = val;
    }
  }

  // 4. Parse Hour Target (e.g., at 9 AM, at 20, at 8)
  let targetHour = 9; // Default
  const hourMatch = text.match(/at\s+(\d+)(?:\s*(am|pm|o'clock))?/i);
  if (hourMatch) {
    let hr = parseInt(hourMatch[1], 10);
    const ampm = hourMatch[2] ? hourMatch[2].toLowerCase() : null;
    if (ampm === "pm" && hr < 12) {
      hr += 12;
    } else if (ampm === "am" && hr === 12) {
      hr = 0;
    } else if (!ampm && hr < 7) {
      // Intelligently default low numbers without AM/PM to PM (e.g., "at 3" -> 15:00)
      hr += 12;
    }
    if (hr >= 0 && hr <= 23) {
      targetHour = hr;
    }
  }

  // 5. Parse Days of Week
  let days = [];
  const dayMap = {
    "monday": 1, "mon": 1, "mondays": 1,
    "tuesday": 2, "tue": 2, "tuesdays": 2,
    "wednesday": 3, "wed": 3, "wednesdays": 3,
    "thursday": 4, "thu": 4, "thursdays": 4,
    "friday": 5, "fri": 5, "fridays": 5,
    "saturday": 6, "sat": 6, "saturdays": 6,
    "sunday": 0, "sun": 0, "sundays": 0
  };

  if (text.includes("weekdays")) {
    days = [1, 2, 3, 4, 5];
  } else if (text.includes("weekends")) {
    days = [6, 0];
  } else if (text.includes("everyday") || text.includes("every day") || text.includes("daily")) {
    days = [1, 2, 3, 4, 5, 6, 0];
  } else {
    Object.keys(dayMap).forEach(d => {
      const regex = new RegExp(`\\b${d}\\b`, 'i');
      if (regex.test(text)) {
        const val = dayMap[d];
        if (!days.includes(val)) days.push(val);
      }
    });
  }

  // Fallback if no days parsed
  if (days.length === 0) {
    days = [selectedDay];
  }

  // 6. Set Time block
  let preferredBlock = "morning";
  if (targetHour >= 6 && targetHour < 12) preferredBlock = "morning";
  else if (targetHour >= 12 && targetHour < 18) preferredBlock = "afternoon";
  else if (targetHour >= 18 && targetHour < 24) preferredBlock = "evening";
  else preferredBlock = "night";

  // Pre-populate Form & Open Add Modal
  handleOpenAddModal();

  document.getElementById('form-name').value = name;
  document.getElementById('form-category').value = category;
  document.getElementById('form-duration').value = duration;
  document.getElementById('form-target-hour').value = targetHour;
  document.getElementById('form-preferred-block').value = preferredBlock;
  document.getElementById('form-energy').value = "3";
  document.getElementById('energy-badge').textContent = "3";
  document.getElementById('form-priority').value = "3";
  document.getElementById('priority-badge').textContent = "3";

  document.querySelectorAll('.day-checkbox').forEach(cb => {
    cb.checked = days.includes(parseInt(cb.value, 10));
  });

  // WCAG AAA Sensory Guidance: Visually flash voice-fed fields to confirm recognition
  const inputsToHighlight = [
    document.getElementById('form-name'),
    document.getElementById('form-category'),
    document.getElementById('form-duration'),
    document.getElementById('form-target-hour')
  ];

  inputsToHighlight.forEach(el => {
    el.style.borderColor = 'var(--neon-pink)';
    el.style.boxShadow = '0 0 12px var(--neon-pink-glow)';
  });

  setTimeout(() => {
    inputsToHighlight.forEach(el => {
      el.style.borderColor = '';
      el.style.boxShadow = '';
    });
  }, 1800);
}

function capitalizeWords(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
