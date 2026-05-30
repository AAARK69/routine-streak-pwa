// Local Storage Key Names
const STORAGE_KEY = 'aether_pwa_state';

// Default mock routines and completion logs
const MOCK_ROUTINES = [
  {
    id: 'rt_algo',
    name: 'Algorithm Design & Analysis',
    category: 'Academics',
    energy: 5,
    preferredBlock: 'morning',
    targetHour: 9,
    days: [1, 3, 5], // Mon, Wed, Fri
    duration: 90,
    priority: 5,
    conflictGroup: 'studying'
  },
  {
    id: 'rt_gym',
    name: 'Strength Training (Gym)',
    category: 'Health',
    energy: 4,
    preferredBlock: 'morning',
    targetHour: 7,
    days: [1, 3, 5], // Mon, Wed, Fri
    duration: 60,
    priority: 4,
    conflictGroup: 'physical'
  },
  {
    id: 'rt_db_lab',
    name: 'Database Systems Lab',
    category: 'Academics',
    energy: 3,
    preferredBlock: 'afternoon',
    targetHour: 14,
    days: [2, 4], // Tue, Thu
    duration: 120,
    priority: 4,
    conflictGroup: 'studying'
  },
  {
    id: 'rt_research',
    name: 'Research Paper Deep Dive',
    category: 'Academics',
    energy: 4,
    preferredBlock: 'morning',
    targetHour: 10,
    days: [2, 4], // Tue, Thu
    duration: 60,
    priority: 3,
    conflictGroup: 'studying'
  },
  {
    id: 'rt_meditation',
    name: 'Mindfulness & Breathing',
    category: 'Health',
    energy: 1,
    preferredBlock: 'evening',
    targetHour: 21,
    days: [0, 1, 2, 3, 4, 5, 6], // Daily
    duration: 20,
    priority: 5,
    conflictGroup: 'wellbeing'
  },
  {
    id: 'rt_coding',
    name: 'Personal Cyberpunk Web App',
    category: 'Work',
    energy: 5,
    preferredBlock: 'afternoon',
    targetHour: 13,
    days: [6, 0], // Sat, Sun
    duration: 180,
    priority: 4,
    conflictGroup: 'studying'
  },
  {
    id: 'rt_weekly_rev',
    name: 'Weekly Sprint Retrospective',
    category: 'Work',
    energy: 2,
    preferredBlock: 'evening',
    targetHour: 17,
    days: [0], // Sunday
    duration: 60,
    priority: 3,
    conflictGroup: 'planning'
  }
];

// Generate completions mock data for the last 14 days (excluding a few misses to show realistic streaks)
function generateMockCompletions() {
  const completions = {};
  const today = new Date();
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    completions[dateString] = [];
    
    MOCK_ROUTINES.forEach(rt => {
      // If routine is scheduled for this day
      if (rt.days.includes(dayOfWeek)) {
        // Let's complete it 85% of the time, except maybe one specific day (e.g. 4 days ago) to break a streak and show max streak vs current streak.
        const isMissDay = (i === 4);
        if (Math.random() > 0.15 && !isMissDay) {
          completions[dateString].push(rt.id);
        }
      }
    });
  }
  return completions;
}

// Read the complete storage state
export function getStorageState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First-time load: populate with high-contrast mock data
      const initialState = {
        routines: MOCK_ROUTINES,
        completions: generateMockCompletions()
      };
      saveStorageState(initialState);
      return initialState;
    }
    const state = JSON.parse(raw);
    // basic schema check
    if (!state.routines || !state.completions) {
      throw new Error("Invalid state schema");
    }
    return state;
  } catch (error) {
    console.error('Failed to read LocalStorage. Initializing fresh store.', error);
    const fallback = { routines: MOCK_ROUTINES, completions: {} };
    saveStorageState(fallback);
    return fallback;
  }
}

// Write the complete storage state
export function saveStorageState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Trigger storage event for cross-tab synchronization
    window.dispatchEvent(new Event('storage-update'));
    return true;
  } catch (error) {
    console.error('Failed to save state to LocalStorage', error);
    return false;
  }
}

// Reset store to factory settings
export function resetStateToMock() {
  const fresh = {
    routines: MOCK_ROUTINES,
    completions: generateMockCompletions()
  };
  saveStorageState(fresh);
  return fresh;
}

export function clearAllState() {
  const empty = {
    routines: [],
    completions: {}
  };
  saveStorageState(empty);
  return empty;
}

// Export state as a downloadable JSON file
export function exportStateToFile() {
  const state = getStorageState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `aether-routine-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import state from a JSON string with comprehensive validation
export function importStateFromString(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validation checks
    if (!parsed || typeof parsed !== 'object') throw new Error('Data is not a valid JSON object');
    if (!Array.isArray(parsed.routines)) throw new Error('Routines must be an array');
    if (parsed.completions && typeof parsed.completions !== 'object') throw new Error('Completions must be an object structure');
    
    // Deep validate routines
    const validatedRoutines = parsed.routines.map((rt, idx) => {
      if (!rt.name || typeof rt.name !== 'string') throw new Error(`Routine at index ${idx} is missing a name`);
      
      return {
        id: rt.id || `rt_${Math.random().toString(36).substr(2, 9)}`,
        name: rt.name,
        category: rt.category || 'General',
        energy: Math.max(1, Math.min(5, Number(rt.energy) || 3)),
        preferredBlock: ['morning', 'afternoon', 'evening', 'night'].includes(rt.preferredBlock) ? rt.preferredBlock : 'morning',
        targetHour: Math.max(0, Math.min(23, Number(rt.targetHour) || 9)),
        days: Array.isArray(rt.days) ? rt.days.filter(d => d >= 0 && d <= 6) : [1, 2, 3, 4, 5],
        duration: Math.max(5, Math.min(1440, Number(rt.duration) || 30)),
        priority: Math.max(1, Math.min(5, Number(rt.priority) || 3)),
        conflictGroup: rt.conflictGroup || ''
      };
    });

    const validatedCompletions = {};
    if (parsed.completions) {
      Object.keys(parsed.completions).forEach(dateStr => {
        // validate YYYY-MM-DD key format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && Array.isArray(parsed.completions[dateStr])) {
          validatedCompletions[dateStr] = parsed.completions[dateStr].filter(id => typeof id === 'string');
        }
      });
    }

    const newState = {
      routines: validatedRoutines,
      completions: validatedCompletions
    };

    saveStorageState(newState);
    return { success: true, count: validatedRoutines.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
