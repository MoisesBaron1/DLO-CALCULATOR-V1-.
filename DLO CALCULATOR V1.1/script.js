(() => {
  let systems = {
    "LG225": {
      name: "LG225",
      strategy: "edgeCenter",
      frames: { single: 0.5, edge: 0.25, center: 0.125, perPiece: 0.125 },
      lites: { single: 0.5, edge: 0.25, center: 0.125, perPiece: 0.125 }
    },
    "ES-8000/T": {
      name: "ES-8000/T",
      strategy: "edgeCenter",
      frames: { single: 0.75, edge: 0.375, center: 0.125, perPiece: 0.125 },
      lites: { single: 0.75, edge: 0.375, center: 0.125, perPiece: 0.125 }
    },
    "CW": {
      name: "CW (1032-7525-7000)",
      strategy: "perPiece",
      frames: { single: 0.625, perPiece: 0.125 },
      lites: { single: 0.625, perPiece: 0.125 }
    }
  };

  // Supabase configuration (provided)
  const SUPABASE_URL = 'https://dpiqxmazfbvqgdqnpwdd.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_0LwxrMSBCDYy-t5UCld9KA_plNzAN_x';
  const supabaseClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  async function loadRemoteSystems(){
    if(!supabaseClient) return;
    try{
      const { data, error } = await supabaseClient.from('systems').select('*');
      if(error){ console.warn('Supabase systems fetch error:', error.message); return; }
      if(!data || !data.length) return;
      // expect rows with id/name/strategy/frames/lites (JSON)
      const remote = {};
      data.forEach(row=>{
        // try to parse JSON fields if stored as text
        let frames = row.frames || {};
        let lites = row.lites || {};
        try{ if(typeof frames === 'string') frames = JSON.parse(frames); }catch(e){}
        try{ if(typeof lites === 'string') lites = JSON.parse(lites); }catch(e){}
        const key = row.id || row.name || `sys_${Math.random().toString(36).slice(2,7)}`;
        remote[key] = { name: row.name || key, strategy: row.strategy || 'edgeCenter', frames, lites };
      });
      systems = remote;
      // repopulate select
      systemSelect.innerHTML = '';
      populateSystems();
      console.log('Loaded systems from Supabase:', Object.keys(systems));
    }catch(err){
      console.warn('Failed loading remote systems:', err.message||err);
    }
  }

  const $ = id => document.getElementById(id);

  const systemSelect = $('system-select');
  const modeSelect = $('mode-select');
  const inputWidth = $('input-width');
  const inputHeight = $('input-height');
  const inputQty = $('input-qty');
  const btnCalc = $('btn-calc');
  const btnReset = $('btn-reset');
  const results = $('results');

  function populateSystems(){
    Object.keys(systems).forEach(key=>{
      const opt = document.createElement('option'); opt.value = key; opt.textContent = systems[key].name || key; systemSelect.appendChild(opt);
    });
  }

  function toFraction(inches){
    if (!isFinite(inches)) return '-';
    const sign = inches < 0 ? -1 : 1;
    inches = Math.abs(inches);
    const whole = Math.floor(inches);
    const frac = Math.round((inches - whole) * 16);
    const gcd = (a,b)=>b?gcd(b,a%b):a;
    if(frac===0) return (whole*sign).toString() + '"';
    const g = gcd(frac,16);
    const num = frac/g; const den = 16/g;
    const wholeStr = whole?whole+' ' : '';
    return (sign<0?'-':'') + wholeStr + num + '/' + den + '"';
  }

  function calculate(){
    const sysKey = systemSelect.value;
    const sys = systems[sysKey];
    const mode = modeSelect.value; // frames or lites
    let width = parseFloat(inputWidth.value) || 0;
    let height = parseFloat(inputHeight.value) || 0;
    let qty = Math.max(1, parseInt(inputQty.value)||1);

    let out = '';
    if(!sys){ results.textContent = 'Select a system.'; return; }

    if(mode === 'frames'){
      // calculate DLO size across width for frames (horizontal)
      if(sys.strategy === 'edgeCenter'){
        const edge = sys.frames.edge ?? 0;
        const center = sys.frames.center ?? 0;
        const totalDeduction = 2*edge + (qty-1)*center;
        const dlo = width - totalDeduction;
        out += `Input width: ${width.toFixed(4)} in\n`;
        out += `Deduction: ${totalDeduction.toFixed(4)} in\n`;
        out += `DLO width: ${dlo.toFixed(4)} in (${toFraction(dlo)})`;
      } else {
        const per = sys.frames.perPiece ?? sys.frames.single ?? 0;
        const totalDeduction = per*qty;
        const dlo = width - totalDeduction;
        out += `Input width: ${width.toFixed(4)} in\n`;
        out += `Deduction (${per} in per piece): ${totalDeduction.toFixed(4)} in\n`;
        out += `DLO width: ${dlo.toFixed(4)} in (${toFraction(dlo)})`;
      }
    } else {
      // lites vertical calculation based on height
      if(sys.strategy === 'edgeCenter'){
        const edge = sys.lites.edge ?? 0;
        const center = sys.lites.center ?? 0;
        const totalDeduction = 2*edge + (qty-1)*center;
        const dlo = height - totalDeduction;
        out += `Input height: ${height.toFixed(4)} in\n`;
        out += `Deduction: ${totalDeduction.toFixed(4)} in\n`;
        out += `DLO height: ${dlo.toFixed(4)} in (${toFraction(dlo)})`;
      } else {
        const per = sys.lites.perPiece ?? sys.lites.single ?? 0;
        const totalDeduction = per*qty;
        const dlo = height - totalDeduction;
        out += `Input height: ${height.toFixed(4)} in\n`;
        out += `Deduction (${per} in per piece): ${totalDeduction.toFixed(4)} in\n`;
        out += `DLO height: ${dlo.toFixed(4)} in (${toFraction(dlo)})`;
      }
    }

    results.textContent = out;
  }

  function reset(){
    inputWidth.value=''; inputHeight.value=''; inputQty.value='1'; results.textContent='Awaiting input...';
  }

  populateSystems();
  // attempt to load systems from Supabase and override if available
  loadRemoteSystems();
  btnCalc.addEventListener('click', calculate);
  btnReset.addEventListener('click', reset);

  // quick keyboard support: Enter to calculate
  [inputWidth,inputHeight,inputQty].forEach(el=>el.addEventListener('keydown', (e)=>{ if(e.key==='Enter') calculate(); }));

})();
