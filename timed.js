// timed.js (module)
// Timed quiz page with KaTeX support and exam filter
const QUESTIONS_URL = 'questions.json';
const QUIZ_SIZE = 10;
const DURATION_MS = 10 * 60 * 1000; // 10 minutes

// DOM
const createBtn = document.getElementById('createBtn');
const shareArea = document.getElementById('shareArea');
const shareLinkEl = document.getElementById('shareLink');
const copyBtn = document.getElementById('copyBtn');
const timerArea = document.getElementById('timerArea');
const timerEl = document.getElementById('timer');
const quizArea = document.getElementById('quizArea');
const submitBtn = document.getElementById('submitBtn');
const restartBtn = document.getElementById('restartBtn');
const modeSelect = document.getElementById('modeSelect');
const examSelect = document.getElementById('examSelect');

let allQuestions = [];
let currentSet = [];
let token = null;
let startTs = null;
let timerInterval = null;

// ----------------- utility: seeded RNG (mulberry32) -----------------
function hashStringToSeed(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
function seededShuffle(arr, seed) {
  const a = arr.slice();
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----------------- deterministic token helpers -----------------
function randomToken() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let t = '';
  for (let i = 0; i < 4; i++) t += letters[Math.floor(Math.random() * letters.length)];
  return t;
}
function setQueryParams(t, exam) {
  const url = new URL(window.location.href);
  if (t) url.searchParams.set('quiz', t);
  else url.searchParams.delete('quiz');
  if (exam && exam !== 'all') url.searchParams.set('exam', exam);
  else url.searchParams.delete('exam');
  history.replaceState(null, '', url.toString());
}
function getQueryParams() {
  const url = new URL(window.location.href);
  return {
    quiz: url.searchParams.get('quiz'),
    exam: url.searchParams.get('exam')
  };
}

// ----------------- Loading questions -----------------
async function loadQuestions() {
  const res = await fetch(QUESTIONS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load questions.json');
  const js = await res.json();
  // ensure stable string IDs: if id missing or non-string, coerce
  allQuestions = js.map((q, idx) => ({
    ...q,
    id: q.id != null ? String(q.id) : `${q.exam ?? 'Q'}-${q.year ?? '0'}-${idx}`
  }));

  populateExamFilter();
}

// populate exam dropdown with dynamic list plus "All"
function populateExamFilter() {
  const exams = Array.from(new Set(allQuestions.map(q => q.exam).filter(Boolean))).sort();
  // clear existing (except the first "all" option)
  examSelect.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
  exams.forEach(ex => {
    const opt = document.createElement('option');
    opt.value = ex;
    opt.textContent = ex;
    examSelect.appendChild(opt);
  });

  // if exam param exists in URL, set it
  const { exam } = getQueryParams();
  if (exam) {
    // if value not present, add it
    if (![...examSelect.options].some(o => o.value === exam)) {
      const opt = document.createElement('option');
      opt.value = exam;
      opt.textContent = exam;
      examSelect.appendChild(opt);
    }
    examSelect.value = exam;
  }
}

// ----------------- pick questions deterministically from token & exam -----------------
function questionsForToken(t, exam = 'all') {
  // produce seed from token string plus exam so token+exam -> same set
  const seed = hashStringToSeed(`${t}|${exam}`);
  // build pool based on exam filter
  let pool = allQuestions;
  if (exam && exam !== 'all') {
    pool = allQuestions.filter(q => q.exam === exam);
  }
  // If the filtered pool is smaller than QUIZ_SIZE, fall back to "all" with a warning
  if (pool.length < QUIZ_SIZE) {
    console.warn(`Not enough questions for exam='${exam}' (found ${pool.length}). Using all exams.`);
    pool = allQuestions;
  }
  const shuffled = seededShuffle(pool, seed);
  return shuffled.slice(0, QUIZ_SIZE);
}

// ----------------- rendering quiz (with KaTeX rendering) -----------------
function renderQuiz(questions) {
  quizArea.innerHTML = '';
  submitBtn.disabled = false;
  restartBtn.hidden = true;

  questions.forEach((q, idx) => {
    const card = document.createElement('section');
    card.className = 'card';
    card.dataset.qid = q.id ?? `q-${idx}`;

    const meta = document.createElement('div');
    meta.className = 'question-meta';
    meta.textContent = `${q.exam ?? 'Unknown'} • ${q.year ?? ''}`;
    card.appendChild(meta);

    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `${idx + 1}. ${q.question}`;
    fieldset.appendChild(legend);

    const options = document.createElement('div');
    options.className = 'options';

    (q.options || []).forEach((optText, optIndex) => {
      const opt = document.createElement('div');
      opt.className = 'option';
      opt.dataset.index = optIndex;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `q-${idx}`;
      input.id = `q-${idx}-opt-${optIndex}`;
      input.value = optIndex;

      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = optText;

      opt.appendChild(input);
      opt.appendChild(label);
      options.appendChild(opt);
    });

    fieldset.appendChild(options);

    if (q.image) {
      const imgWrap = document.createElement('div');
      imgWrap.style.marginTop = '10px';
      const img = document.createElement('img');
      img.src = q.image;
      img.style.maxWidth = '320px';
      img.style.maxHeight = '320px';
      imgWrap.appendChild(img);
      fieldset.appendChild(imgWrap);
    }

    const explanation = document.createElement('div');
    explanation.className = 'explanation';
    explanation.style.display = 'none';
    explanation.textContent = q.explanation ?? 'No explanation provided.';

    card.appendChild(fieldset);
    card.appendChild(explanation);
    quizArea.appendChild(card);
  });

  // LaTeX rendering: use KaTeX auto-render if available
  try {
    if (window.renderMathInElement) {
      window.renderMathInElement(quizArea, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
  } catch (e) {
    console.error('KaTeX render error', e);
  }
}

// ----------------- timer helpers -----------------
function formatMs(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
function startTimerForToken(t) {
  const key = `timed_${t}_start`;
  let ts = localStorage.getItem(key);
  if (!ts) {
    ts = String(Date.now());
    localStorage.setItem(key, ts);
  }
  startTs = Number(ts);
  updateTimerUI();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimerUI, 500);
}
function updateTimerUI() {
  if (!startTs) return;
  const elapsed = Date.now() - startTs;
  const remaining = DURATION_MS - elapsed;
  timerEl.textContent = formatMs(remaining);
  timerArea.style.display = '';
  if (remaining <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerEl.textContent = '00:00';
    revealAnswers();
  }
}

// ----------------- grader & reveal -----------------
function revealAnswers() {
  const cards = Array.from(quizArea.querySelectorAll('.card'));
  cards.forEach((card, idx) => {
    const q = currentSet[idx];
    const selected = card.querySelector('input[type=radio]:checked');
    card.querySelectorAll('.option').forEach(el => el.classList.remove('correct', 'wrong'));
    const correctIndex = q.answer;
    const correctOptionEl = card.querySelector(`.option[data-index="${correctIndex}"]`);
    if (correctOptionEl) correctOptionEl.classList.add('correct');
    if (selected) {
      const chosenIndex = Number(selected.value);
      if (chosenIndex !== correctIndex) {
        const chosenEl = card.querySelector(`.option[data-index="${chosenIndex}"]`);
        if (chosenEl) chosenEl.classList.add('wrong');
      }
    }
    const explanation = card.querySelector('.explanation');
    if (explanation) explanation.style.display = 'block';
  });
  submitBtn.disabled = true;
  restartBtn.hidden = false;
}

// ----------------- create / open flow -----------------
createBtn.addEventListener('click', async () => {
  if (!allQuestions.length) await loadQuestions();
  const exam = examSelect.value || 'all';
  token = randomToken();
  setQueryParams(token, exam);
  currentSet = questionsForToken(token, exam);
  renderQuiz(currentSet);
  startTimerForToken(token);
  shareArea.style.display = '';
  shareLinkEl.textContent = window.location.href;
  timerArea.style.display = '';
  submitBtn.disabled = false;
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareLinkEl.textContent);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy', 1500);
  } catch (e) {
    alert('Copy failed — manually copy the link.');
  }
});

// when visiting URL with ?quiz=XXXX open that token
async function openFromUrlIfPresent() {
  const params = getQueryParams();
  if (!params.quiz) return;
  token = params.quiz.toUpperCase().slice(0,4).replace(/[^A-Z]/g,'A'); // sanitize
  const examParam = params.exam || 'all';
  if (!allQuestions.length) await loadQuestions();
  // ensure examSelect includes this option and set it
  if (![...examSelect.options].some(o => o.value === examParam)) {
    const opt = document.createElement('option');
    opt.value = examParam;
    opt.textContent = examParam;
    examSelect.appendChild(opt);
  }
  examSelect.value = examParam;
  currentSet = questionsForToken(token, examParam);
  renderQuiz(currentSet);
  startTimerForToken(token);
  shareArea.style.display = '';
  shareLinkEl.textContent = window.location.href;
  timerArea.style.display = '';
  submitBtn.disabled = false;
}

// submit/reveal button
submitBtn.addEventListener('click', () => {
  revealAnswers();
});

// restart (resets the local start time so you can re-take)
restartBtn.addEventListener('click', () => {
  if (!token) return;
  if (!confirm('Restart this timed quiz (reset your local start time)?')) return;
  localStorage.removeItem(`timed_${token}_start`);
  startTimerForToken(token);
  const cards = Array.from(quizArea.querySelectorAll('.card'));
  cards.forEach(card => {
    card.querySelectorAll('input[type=radio]').forEach(i => i.checked = false);
    card.querySelectorAll('.option').forEach(el => el.classList.remove('correct','wrong'));
    const explanation = card.querySelector('.explanation');
    if (explanation) explanation.style.display = 'none';
  });
  submitBtn.disabled = false;
  restartBtn.hidden = true;
});

// optionally support choosing "open by link" mode
modeSelect.addEventListener('change', () => {
  const v = modeSelect.value;
  if (v === 'link') {
    const existing = getQueryParams().quiz;
    if (!existing) {
      alert('No quiz token in the URL. Create one or append ?quiz=ABCD to the URL.');
    } else {
      openFromUrlIfPresent();
    }
  }
});

// change exam selection: if token exists and user changes exam, regenerate token? we keep token and set exam param only when creating
examSelect.addEventListener('change', () => {
  // If user changes exam while a quiz token is present, update the share link to include the exam.
  if (token) {
    setQueryParams(token, examSelect.value);
    shareLinkEl.textContent = window.location.href;
  }
});

// on load: try to open from URL
(async function init() {
  try {
    await loadQuestions();
    await openFromUrlIfPresent();
  } catch (e) {
    quizArea.innerHTML = `<div class="card"><p style="color:#b91c1c">Failed to initialize timed quiz: ${e.message}</p></div>`;
    console.error(e);
  }
})();
