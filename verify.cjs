const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function run() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="calendar-legend-list"></div>
    <div id="year-calendar-grid"></div>
    <span id="annual-goal-subtitle"></span>
  </body></html>`, { url: "http://localhost/" });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.localStorage = dom.window.localStorage;

  const ui = await import('./js/ui.js');

  const state = {
    routines: [
      { id: '1', name: 'R1', category: 'Health', days: [0, 1, 2, 3, 4, 5, 6] },
      { id: '2', name: 'R2', category: 'Work', days: [1, 2, 3, 4, 5] },
      { id: '3', name: 'R3', category: 'Academics', days: [0, 6] },
    ],
    completions: {}
  };

  for(let m=1; m<=12; m++) {
    for(let d=1; d<=28; d++) {
        state.completions[`2026-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`] = ['1', '2'];
    }
  }

  ui.renderYearGrid(state);

  const html = document.getElementById('year-calendar-grid').innerHTML;
  if(html.includes('active-completed') && html.includes('active-missed') && html.includes('month-title')) {
     console.log('SUCCESS');
  } else {
     console.log('FAILED');
  }
}

run();
