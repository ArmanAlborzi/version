/* ===========================================
   GLOBAL UTILITIES
=========================================== */
function $(sel, root=document){ return root.querySelector(sel); }
function getFormData(form){
  const data = new FormData(form);
  return Object.fromEntries([...data.entries()]);
}
function saveLS(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function loadLS(key, fallback=null){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

/* ===========================================
   AoPS SEARCH PARSER
   Accepts loose user queries like:
   - "amc 12b 2022 problem 3"
   - "2021 aime ii #7"
   - "usamo 2019 p1"
   - "2020 amc 10 a 20"
   Redirects to the appropriate AoPS wiki URL.
=========================================== */
function canonicalAoPSUrl(parts){
  const { year, exam, level, variant, problem } = parts;

  // Build the wiki title parts precisely
  let title = `${year}_`;

  if (exam === 'amc'){
    // e.g., 2022_AMC_12B_Problems/Problem_3
    const lvl = level === '10' ? '10' : '12';
    const varLetter = (variant || 'A').toUpperCase(); // default A if omitted
    title += `AMC_${lvl}${varLetter}_Problems`;
  } else if (exam === 'aime'){
    // e.g., 2015_AIME_II_Problems/Problem_7
    const roman = (variant || 'I').toUpperCase().replace('1','I').replace('2','II');
    title += `AIME_${roman}_Problems`;
  } else if (exam === 'usamo'){
    // e.g., 2019_USAMO_Problems/Problem_1
    title += `USAMO_Problems`;
  } else if (exam === 'usajmo'){
    title += `USAJMO_Problems`;
  } else {
    throw new Error('Unsupported exam');
  }

  // If no problem number present, go to Problems page index
  const path = problem ? `${title}/Problem_${problem}` : title;

  // Construct final encoded url
  const base = 'https://artofproblemsolving.com/wiki/index.php/';
  // AoPS accepts spaces/underscores; encoding is fine.
  return base + encodeURIComponent(path);
}

function parseSearchQueryToAoPS(queryRaw){
  const q = queryRaw.toLowerCase().replace(/[^a-z0-9\s#]/g, ' ').replace(/\s+/g,' ').trim();

  // Pull tokens
  const tokens = q.split(' ');

  // Extract key parts
  const year = (tokens.find(t => /^\d{4}$/.test(t)) || '');
  if (!year) throw new Error('Please include a 4-digit year.');

  // exam detection
  let exam = '';
  if (tokens.includes('amc')) exam = 'amc';
  else if (tokens.includes('aime')) exam = 'aime';
  else if (tokens.includes('usamo')) exam = 'usamo';
  else if (tokens.includes('usajmo')) exam = 'usajmo';
  else throw new Error('Please specify AMC, AIME, USAMO, or USAJMO.');

  // AMC level/variant (10/12 + A/B)
  let level = '';
  let variant = '';

  if (exam === 'amc'){
    if (tokens.includes('10')) level = '10';
    if (tokens.includes('12')) level = '12';
    variant = tokens.includes('12b') || tokens.includes('10b') || tokens.includes('b') ? 'B' :
              tokens.includes('12a') || tokens.includes('10a') || tokens.includes('a') ? 'A' : '';
  }

  if (exam === 'aime'){
    // I / II detection
    if (tokens.includes('ii') || tokens.includes('2') || tokens.includes('ii.')) variant = 'II';
    else variant = 'I';
  }

  // Problem number: look for "problem", "p", "#", or a trailing number
  let p = null;
  const problemIndex = tokens.findIndex(t => t === 'problem' || t === 'p' || t === '#');
  if (problemIndex !== -1 && tokens[problemIndex+1] && /^\d{1,2}$/.test(tokens[problemIndex+1])){
    p = parseInt(tokens[problemIndex+1],10);
  } else {
    // fallback: last numeric token that's 1-30 (covers AMC/AIME ranges)
    const ns = tokens.filter(t => /^\d{1,2}$/.test(t)).map(Number).filter(n => n>=1 && n<=30);
    // Avoid treating the year as a problem; remove the year if present
    const nsNoYear = ns.filter(n => String(n) !== year);
    if (nsNoYear.length) p = nsNoYear[nsNoYear.length - 1];
  }

  // Validate AMC needs level
  if (exam === 'amc' && !level){
    throw new Error('For AMC, include level 10 or 12 (e.g., "AMC 12A").');
  }

  return canonicalAoPSUrl({year, exam, level, variant, problem: p});
}

/* Attach search handling on pages that include #searchForm */
(function initSearch(){
  const form = document.getElementById('searchForm');
  if (!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const q = document.getElementById('q').value.trim();
    const msg = document.getElementById('searchMsg');
    try{
      const url = parseSearchQueryToAoPS(q);
      msg.textContent = 'Opening AoPS...';
      window.location.href = url;
    } catch(err){
      msg.textContent = err.message || 'Could not parse your query. Try: "2022 AMC 12B Problem 3".';
    }
  });
})();

/* ===========================================
   DIAGNOSTIC FLOW — save to localStorage
=========================================== */
(function initDiagnostic(){
  const diagForm = document.getElementById('diagnosticForm');
  if (!diagForm) return;
  diagForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = getFormData(diagForm);
    saveLS('diagnostic', data);
    window.location.href = '/diagnostic/results.html';
  });
})();

/* On Results page: show summary & link to timeline */
(function initResults(){
  const container = document.getElementById('diagResults');
  if (!container) return;
  const data = loadLS('diagnostic', {});
  const goal = data.goal || '(not set)';
  const minutes = data.minutes || '(not set)';
  const date = data.test_date || '(not set)';

  container.innerHTML = `
    <div class="card form">
      <h2>Diagnostic Saved ✅</h2>
      <p class="notice">We’ve stored your inputs locally. You can modify them anytime by retaking the diagnostic.</p>
      <div class="grid">
        <div class="tile card">
          <div class="tile"><h3>Goal</h3><p>${goal.toUpperCase()}</p></div>
        </div>
        <div class="tile card">
          <div class="tile"><h3>Minutes per day</h3><p>${minutes}</p></div>
        </div>
        <div class="tile card">
          <div class="tile"><h3>Target test date</h3><p>${date}</p></div>
        </div>
      </div>
      <div style="margin-top:18px">
        <a class="btn" href="/timeline/">View Timeline (placeholder)</a>
      </div>
    </div>
  `;
})();

/* ===========================================
   TUTORS FORM — store locally for now
=========================================== */
(function initTutors(){
  const form = document.getElementById('tutorForm');
  const status = document.getElementById('tutorStatus');
  if (!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = getFormData(form);
    const all = loadLS('tutor_requests', []);
    all.push({...data, ts: Date.now()});
    saveLS('tutor_requests', all);
    form.reset();
    if (status){
      status.textContent = 'Request received! We’ll reach out shortly.';
    }
  });
})();
