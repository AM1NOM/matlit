// timed.js (module)
// Timed quiz page: deterministic 10-question quizzes keyed by 4-letter token.
// Requirements: place in same folder as questions.json and styles.css

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

let allQuestions = [];
let currentSet = [];
let token = null;
let startTs = null;
let timerInterval = null;

// ----------------- utility: seeded RNG (mulberry32) -----------------
function hashStringToSeed(s) {
  // simple 32-bit hash from string
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
function setQueryToken(t) {
  const url = new URL(window.location.href);
  url.searchParams.set('quiz', t);
  history.replaceState(null, '', url.toString());
}
function getQueryToken() {
  const url = new URL(window.location.href);
  return url.searchParams.get('quiz');
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
}

// ----------------- pick questions deterministically from token -----------------
function questionsForToken(t) {
  // produce seed from token string
  const seed = hashStringToSeed(t);
  const shuffled = seededShuffle(allQuestions, seed);
  return shuffled.slice(0, QUIZ_SIZE);
}

// ----------------- rendering quiz (similar structure to main page) -----------------
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
  // startTs stored in localStorage under key 'timed_<token>'
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
    // time's up — reveal answers automatically
    revealAnswers();
  }
}

// ----------------- grader & reveal -----------------
function revealAnswers() {
  // show correct/wrong and explanations, and disable submit
  const cards = Array.from(quizArea.querySelectorAll('.card'));
  cards.forEach((card, idx) => {
    const q = currentSet[idx];
    const selected = card.querySelector('input[type=radio]:checked');
    // clear old state
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
  // create a new token and load questions
  if (!allQuestions.length) await loadQuestions();
  token = randomToken();
  setQueryToken(token);
  currentSet = questionsForToken(token);
  renderQuiz(currentSet);
  // start timer and show link
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
  const t = getQueryToken();
  if (!t) return;
  token = t.toUpperCase().slice(0,4).replace(/[^A-Z]/g,'A'); // sanitize
  if (!allQuestions.length) await loadQuestions();
  currentSet = questionsForToken(token);
  renderQuiz(currentSet);

  // if a start time exists in localStorage, resume; otherwise set a start time now
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
  // reset UI selections
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
    // show link from URL
    const existing = getQueryToken();
    if (!existing) {
      alert('No quiz token in the URL. Create one or append ?quiz=ABCD to the URL.');
    } else {
      // attempt open
      openFromUrlIfPresent();
    }
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