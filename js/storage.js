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

// Read the complete storage state with LocalStorage fallback & migration
// IndexedDB Configuration
const DB_NAME = 'AetherRoutinesDB';
const STORE_NAME = 'app_state';
const DB_VERSION = 2;

let dbPromise = null;
let useLocalStorageFallback = false;

function getDB() {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) {
        throw new Error("IndexedDB is not supported or defined in this environment");
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'date' });
        }
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        console.error("IndexedDB open error:", event.target.error);
        useLocalStorageFallback = true;
        reject(event.target.error);
      };
    } catch (e) {
      console.error("IndexedDB open exception:", e);
      useLocalStorageFallback = true;
      reject(e);
    }
  });
  
  return dbPromise;
}

// Read a daily note from the notes store
export async function getDailyNote(dateStr) {
  if (useLocalStorageFallback) {
    try {
      return localStorage.getItem(`aether_pwa_note_${dateStr}`) || "";
    } catch (err) {
      console.error("Error reading daily note from LocalStorage fallback", err);
      return "";
    }
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notes', 'readonly');
      const store = transaction.objectStore('notes');
      const request = store.get(dateStr);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.text || "");
        } else {
          resolve("");
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error("Error reading daily note from IndexedDB, switching to LocalStorage", err);
    useLocalStorageFallback = true;
    return localStorage.getItem(`aether_pwa_note_${dateStr}`) || "";
  }
}

// Save a daily note to the notes store and notify other tabs
export async function saveDailyNote(dateStr, noteText) {
  if (useLocalStorageFallback) {
    try {
      localStorage.setItem(`aether_pwa_note_${dateStr}`, noteText);
      if (syncChannel) {
        syncChannel.postMessage({ type: 'NOTE_UPDATED', date: dateStr });
      }
      return true;
    } catch (err) {
      console.error("Error saving daily note to LocalStorage", err);
      return false;
    }
  }

  try {
    const db = await getDB();
    const success = await new Promise((resolve, reject) => {
      const transaction = db.transaction('notes', 'readwrite');
      const store = transaction.objectStore('notes');
      const request = store.put({ date: dateStr, text: noteText });
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });

    if (success && syncChannel) {
      syncChannel.postMessage({ type: 'NOTE_UPDATED', date: dateStr });
    }
    return success;
  } catch (err) {
    console.error("Error saving daily note to IndexedDB, switching to LocalStorage", err);
    useLocalStorageFallback = true;
    try {
      localStorage.setItem(`aether_pwa_note_${dateStr}`, noteText);
      if (syncChannel) {
        syncChannel.postMessage({ type: 'NOTE_UPDATED', date: dateStr });
      }
      return true;
    } catch (fallbackErr) {
      console.error("Error saving daily note to LocalStorage fallback", fallbackErr);
      return false;
    }
  }
}

// Read state from IndexedDB
async function getDBState() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('state');
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error("Error reading from IndexedDB", err);
    return null;
  }
}

// Write state to IndexedDB
async function saveDBState(state) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, 'state');
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error("Error writing to IndexedDB", err);
    return false;
  }
}

// BroadcastChannel for cross-tab synchronization
const syncChannel = (typeof window !== 'undefined' && 'BroadcastChannel' in window) ? new BroadcastChannel('aether_state_sync') : null;

// Read the complete storage state with LocalStorage fallback & migration
export async function getStorageState() {
  if (!useLocalStorageFallback) {
    try {
      // 1. Try to load from IndexedDB
      let state = await getDBState();
      
      if (state) {
        // Basic schema check
        if (!state.routines || !state.completions) {
          throw new Error("Invalid IndexedDB state schema");
        }
        return state;
      }
      
      // 2. If no state in IndexedDB, check LocalStorage for migration
      console.log("No state in IndexedDB. Checking LocalStorage for migration...");
      const rawLocalStorage = localStorage.getItem(STORAGE_KEY);
      if (rawLocalStorage) {
        try {
          const parsed = JSON.parse(rawLocalStorage);
          if (parsed && parsed.routines && parsed.completions) {
            console.log("Migration: Found existing state in LocalStorage. Migrating to IndexedDB...");
            await saveDBState(parsed);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('storage-update'));
            }
            return parsed;
          }
        } catch (err) {
          console.error("Migration: Failed to parse LocalStorage data", err);
        }
      }
      
      // 3. First-time load: populate with clean, empty slate
      const initialState = {
        routines: [],
        completions: {}
      };
      await saveDBState(initialState);
      return initialState;
    } catch (error) {
      console.error('IndexedDB error during getStorageState. Switching to LocalStorage fallback.', error);
      useLocalStorageFallback = true;
    }
  }

  // LocalStorage Fallback Code
  console.log("Running storage reader in LocalStorage fallback mode.");
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.routines && parsed.completions) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read state from LocalStorage fallback", err);
  }
  const fallback = { routines: [], completions: {} };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
  } catch (err) {
    console.error("Failed to initialize LocalStorage fallback", err);
  }
  return fallback;
}

// Write the complete storage state
export async function saveStorageState(state) {
  if (useLocalStorageFallback) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage-update'));
      }
      if (syncChannel) {
        syncChannel.postMessage({ type: 'STATE_UPDATED' });
      }
      return true;
    } catch (error) {
      console.error('Failed to save state to LocalStorage fallback', error);
      return false;
    }
  }

  try {
    const success = await saveDBState(state);
    if (success) {
      // Trigger local storage-update event for this window
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage-update'));
      }
      
      // Notify other tabs via BroadcastChannel
      if (syncChannel) {
        syncChannel.postMessage({ type: 'STATE_UPDATED' });
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to save state to IndexedDB, switching to LocalStorage fallback', error);
    useLocalStorageFallback = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage-update'));
      }
      if (syncChannel) {
        syncChannel.postMessage({ type: 'STATE_UPDATED' });
      }
      return true;
    } catch (fallbackErr) {
      console.error('Failed to save state to LocalStorage fallback', fallbackErr);
      return false;
    }
  }
}

// Reset store to factory settings
export async function resetStateToMock() {
  const fresh = {
    routines: MOCK_ROUTINES,
    completions: generateMockCompletions()
  };
  await saveStorageState(fresh);
  return fresh;
}

export async function clearAllState() {
  const empty = {
    routines: [],
    completions: {}
  };
  await saveStorageState(empty);
  return empty;
}

// Export state as a downloadable JSON file
export async function exportStateToFile() {
  const state = await getStorageState();
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

// Import state from a JSON string with comprehensive validation, auto-merging, and deduplication
export async function importStateFromString(jsonString) {
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

    // --- AUTO-MERGING & DEDUPLICATING ---
    const currentState = await getStorageState();
    
    const finalRoutines = [...currentState.routines];
    const idTranslation = {}; // maps imported routine ID to existing/merged routine ID
    
    let addedCount = 0;
    let mergedCount = 0;

    validatedRoutines.forEach(importedRt => {
      // 1. Try to find a routine with the exact same ID
      let existingIndex = finalRoutines.findIndex(r => r.id === importedRt.id);
      
      // 2. If not found by ID, try to find a routine with the exact same name (case-insensitive)
      if (existingIndex === -1) {
        existingIndex = finalRoutines.findIndex(r => r.name.trim().toLowerCase() === importedRt.name.trim().toLowerCase());
      }
      
      if (existingIndex > -1) {
        // We have a match! Merge properties.
        const existingRt = finalRoutines[existingIndex];
        
        // Save the translation mapping
        idTranslation[importedRt.id] = existingRt.id;
        
        // Merge: take importedRt's values, but preserve existing ID
        finalRoutines[existingIndex] = {
          ...existingRt,
          ...importedRt,
          id: existingRt.id // keep the original ID to protect historical completion logs
        };
        mergedCount++;
      } else {
        // No match found: add new routine
        finalRoutines.push(importedRt);
        idTranslation[importedRt.id] = importedRt.id;
        addedCount++;
      }
    });

    // Merge completions
    const finalCompletions = { ...currentState.completions };
    let completionsCount = 0;

    Object.keys(validatedCompletions).forEach(dateStr => {
      // Map imported routine IDs to their translated IDs
      const mappedImportedIds = validatedCompletions[dateStr].map(id => idTranslation[id] || id);
      
      if (!finalCompletions[dateStr]) {
        finalCompletions[dateStr] = [];
      }
      
      const beforeLength = finalCompletions[dateStr].length;
      
      // Merge lists and deduplicate using Set
      finalCompletions[dateStr] = Array.from(new Set([
        ...finalCompletions[dateStr],
        ...mappedImportedIds
      ]));
      
      const newCompletionsAdded = finalCompletions[dateStr].length - beforeLength;
      completionsCount += newCompletionsAdded;
    });

    const newState = {
      routines: finalRoutines,
      completions: finalCompletions
    };

    await saveStorageState(newState);
    return { 
      success: true, 
      addedCount, 
      mergedCount, 
      completionsCount 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
