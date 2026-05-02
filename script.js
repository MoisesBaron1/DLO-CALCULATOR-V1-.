// ============================================================
// CONNECT HTML ELEMENTS
// ============================================================
const inputWidth    = document.getElementById('input-width');
const inputHeight   = document.getElementById('input-height');
const inputQuantity = document.getElementById('input-quantity');
const resultsBox    = document.getElementById('results-box');
const resultsEmpty  = document.getElementById('results-empty');
 
const btnLG225  = document.getElementById('btn-lg225');
const btnES8000 = document.getElementById('btn-es8000t');
const btnCW     = document.getElementById('btn-cw');
const btnFrames = document.getElementById('btn-frames');
const btnLites  = document.getElementById('btn-lites');
 
let selectedSystem = null;
let selectedMode   = null;
 
// ============================================================
// BUTTON LOGIC
// ============================================================
function setActive(selectedBtn, group) {
  group.forEach(b => b.classList.remove('active'));
  selectedBtn.classList.add('active');
}
 
btnLG225.onclick  = () => { selectedSystem = 'LG225';  setActive(btnLG225,  [btnLG225, btnES8000, btnCW]); calculate(); };
btnES8000.onclick = () => { selectedSystem = 'ES8000'; setActive(btnES8000, [btnLG225, btnES8000, btnCW]); calculate(); };
btnCW.onclick     = () => { selectedSystem = 'CW';     setActive(btnCW,     [btnLG225, btnES8000, btnCW]); calculate(); };
btnFrames.onclick = () => { selectedMode = 'frames'; setActive(btnFrames, [btnFrames, btnLites]); calculate(); };
btnLites.onclick  = () => { selectedMode = 'lites';  setActive(btnLites,  [btnFrames, btnLites]); calculate(); };
 
inputWidth.oninput    = calculate;
inputHeight.oninput   = calculate;
inputQuantity.oninput = calculate;
 
// ============================================================
// MAIN CALCULATOR
// ============================================================
function calculate() {
  const width    = parseFloat(inputWidth.value);
  const height   = parseFloat(inputHeight.value);
  const quantity = parseInt(inputQuantity.value);
 
  if (!selectedSystem || !selectedMode || isNaN(quantity) || quantity <= 0) {
    showEmpty(); return;
  }
 
  // Frames use WIDTH. Lites use HEIGHT.
  const measurement = (selectedMode === 'frames') ? width : height;
  if (isNaN(measurement)) { showEmpty(); return; }
 
  let results = [];
  if      (selectedSystem === 'LG225')  results = formulaLG225(measurement, quantity, selectedMode);
  else if (selectedSystem === 'ES8000') results = formulaES8000(measurement, quantity, selectedMode);
  else if (selectedSystem === 'CW')     results = formulaCW(measurement, quantity, selectedMode);
 
  renderResults(results);
}
 
function showEmpty() {
  resultsBox.innerHTML = '';
  resultsEmpty.classList.add('visible');
}
 
// ============================================================
// FORMULAS
//
// QUICK GUIDE FOR MODIFYING DEDUCTIONS:
//   quantity === 1   single piece — only jambs, no mullions
//   isJambEdge       first and last piece (touch the outer frame)
//   the rest         center pieces (between mullions)
//
// Search "TODO" to find every number that needs confirmation.
// ============================================================
 
// --- LG225 ---
function formulaLG225(measurement, quantity, mode) {
  const results = [];
 
  if (mode === 'frames') {
    // LG225 · FRAMES (horizontal)
    if (quantity === 1) {
      results.push(measurement - 3.125);       // TODO: verify single-piece deduction
      return results;
    }
    const base = (measurement - 1.5625) / quantity;
    for (let i = 0; i < quantity; i++) {
      results.push(base - 1.5625);             // TODO: verify per-piece deduction
    }
 
  } else {
    // LG225 · LITES (vertical)
    // TODO: confirm all deductions below with LG225 system data
    if (quantity === 1) {
      results.push(measurement - 3.125);       // TODO: single lite deduction LG225
      return results;
    }
    const base = (measurement - 1.5625) / quantity;
    for (let i = 0; i < quantity; i++) {
      results.push(base - 1.5625);             // TODO: jamb/center deduction LG225 lites
    }
  }
 
  return results;
}
 
// --- ES8000 ---
function formulaES8000(measurement, quantity, mode) {
  const results = [];
 
  if (mode === 'frames') {
    // ES8000 · FRAMES (horizontal)
    if (quantity === 1) {
      results.push(measurement - 4.125);       // TODO: verify single-piece deduction
      return results;
    }
    const gross = measurement / quantity;
    for (let i = 0; i < quantity; i++) {
      const isJambEdge = (i === 0 || i === quantity - 1);
      results.push(isJambEdge
        ? gross - 3.875                        // TODO: jamb edge deduction ES8000 frames
        : gross - 3.125                        // TODO: center deduction ES8000 frames
      );
    }
 
  } else {
    // ES8000 · LITES (vertical)
    // TODO: confirm all deductions below with ES8000 system data
    if (quantity === 1) {
      results.push(measurement - 2);           // TODO: single lite deduction ES8000
      return results;
    }
    const base = (measurement - 2) / quantity;
    for (let i = 0; i < quantity; i++) {
      const isJambEdge = (i === 0 || i === quantity - 1);
      results.push(isJambEdge
        ? base - 1                             // TODO: jamb edge deduction ES8000 lites
        : base                                 // TODO: center deduction ES8000 lites
      );
    }
  }
 
  return results;
}
 
// --- CW (Curtainwall) ---
function formulaCW(measurement, quantity, mode) {
  const results = [];
 
  if (mode === 'frames') {
    // CW · FRAMES (horizontal)
    if (quantity === 1) {
      results.push(measurement - 2);           // TODO: verify single-piece deduction
      return results;
    }
    const base = (measurement - 2) / quantity;
    for (let i = 0; i < quantity; i++) {
      const isJambEdge = (i === 0 || i === quantity - 1);
      results.push(isJambEdge
        ? base - 1                             // TODO: jamb edge deduction CW frames
        : base                                 // TODO: center deduction CW frames
      );
    }
 
  } else {
    // CW · LITES (vertical)
    // TODO: confirm all deductions below with CW system data
    if (quantity === 1) {
      results.push(measurement - 2);           // TODO: single lite deduction CW
      return results;
    }
    const base = (measurement - 2) / quantity;
    for (let i = 0; i < quantity; i++) {
      const isJambEdge = (i === 0 || i === quantity - 1);
      results.push(isJambEdge
        ? base - 1                             // TODO: jamb edge deduction CW lites
        : base                                 // TODO: center deduction CW lites
      );
    }
  }
 
  return results;
}
 
// ============================================================
// RENDER RESULTS
// ============================================================
function renderResults(list) {
  resultsEmpty.classList.remove('visible');
  resultsBox.innerHTML = '';
 
  const label = (selectedMode === 'frames') ? 'Frame' : 'Lite';
 
  list.forEach((value, i) => {
    const isEdge = list.length > 1 && (i === 0 || i === list.length - 1);
    const row = document.createElement('div');
    row.className = 'result-row' + (isEdge ? ' edge' : '');
    row.innerHTML = `
      <span class="row-label">${label} ${i + 1}${isEdge ? ' &middot; jamb' : ''}</span>
      <span class="row-value">${decimalToFraction(value)}</span>
    `;
    resultsBox.appendChild(row);
  });
}
 
// ============================================================
// DECIMAL TO INCH FRACTION (/16) — DO NOT MODIFY
// ============================================================
function decimalToFraction(n) {
  const whole = Math.trunc(n);
  const frac  = Math.abs(n - whole);
  const denom = 16;
  const numer = Math.round(frac * denom);
 
  if (numer === 0)     return `${whole}"`;
  if (numer === denom) return `${whole + 1}"`;
 
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const d   = gcd(numer, denom);
  const fn  = numer / d;
  const fd  = denom / d;
 
  return whole === 0 ? `${fn}/${fd}"` : `${whole} ${fn}/${fd}"`;
}