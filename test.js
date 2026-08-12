import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <div id="stats-total-routines"></div>
  <div id="stats-total-completions"></div>
  <div id="stats-average-completion"></div>
  <div id="streak-heatmap-grid"></div>
  <div id="routine-streaks-container"></div>
</body></html>`, { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, writable: true, configurable: true });
global.localStorage = { getItem: () => null, setItem: () => {} };

const ui = await import('./js/ui.js');
const state = {
  routines: [],
  completions: {}
};
for(let i=0; i<5; i++) {
  state.routines.push({id: 'r'+i, days: [0,1,2,3,4,5,6], category: 'Health', name: 'Name', duration: 30, targetHour: 10, energy: 3 });
}
const today = new Date();
for(let i=0; i<30; i++) {
  let d = new Date(today);
  d.setDate(d.getDate() - i);
  let ds = d.toISOString().split('T')[0];
  state.completions[ds] = state.routines.slice(0, 3).map(r=>r.id);
}

ui.renderStreaks(state);

const heatmap = document.getElementById('streak-heatmap-grid');
console.log('Heatmap cells:', heatmap.children.length);
console.log('Total routines:', document.getElementById('stats-total-routines').textContent);
console.log('Average completion:', document.getElementById('stats-average-completion').textContent);
