// app.js (module)
// Main MatLib site: Firebase Auth + quiz UI

// Firebase SDK (v10) imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ====== CONFIG: replace with your Firebase project's config ====== */
const firebaseConfig = {
  apiKey: "AIzaSyDSdCPIO_QJHPv6sDX5hjWujiaNvtEYD8w",
  authDomain: "matlit-8e3e4.firebaseapp.com",
  projectId: "matlit-8e3e4",
  appId: "1:233226171822:web:b792ddb8510b2ec33dc43f"
};
/* ================================================================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// DOM
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userPic = document.getElementById('userPic');
const userName = document.getElementById('userName');

const examSelect = document.getElementById('examSelect');
const loadBtn = document.getElementById('loadBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const quizArea = document.getElementById('quizArea');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const saveScoreBtn = document.getElementById('saveScoreBtn');

const QUESTIONS_URL = 'questions.json';
const QUIZ_SIZE = 5;

let allQuestions = [];
let currentSet = [];
let currentUser = null;

// auth handlers
loginBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Login failed', err);
    alert('Login failed: ' + (err.message || err));
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'inline-flex';
    userPic.src = user.photoURL || '';
    userName.textContent = user.displayName || user.email || '';
    logoutBtn.style.display = 'inline-block';
  } else {
    loginBtn.style.display = 'inline-block';
    userInfo.style.display = 'none';
  }
});

// util
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// load questions JSON
async function loadQuestions() {
  try {
    const res = await fetch(QUESTIONS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${QUESTIONS_URL}: ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('questions.json must be an array');
    allQuestions = json;
    return json;
  } catch (err) {
    quizArea.innerHTML = `<div class="card"><p style="color:var(--danger)">Unable to load questions.json: ${err.message}</p></div>`;
    throw err;
  }
}

function pickRandomQuestions(exam) {
  let pool = allQuestions;
  if (exam && exam !== 'all') pool = allQuestions.filter(q => q.exam === exam);
  if (pool.length < QUIZ_SIZE) {
    return { error: `Not enough questions for ${exam}. Found ${pool.length}, need ${QUIZ_SIZE}.` };
  }
  return shuffle(pool).slice(0, QUIZ_SIZE);
}

function renderQuiz(questions) {
  quizArea.innerHTML = '';
  submitBtn.disabled = false;
  saveScoreBtn.hidden = true;
  nextBtn.hidden = true;

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

function grade() {
  const cards = Array.from(quizArea.querySelectorAll('.card'));
  let correctCount = 0;

  cards.forEach((card, idx) => {
    const q = currentSet[idx];
    const selected = card.querySelector('input[type=radio]:checked');
    const explanation = card.querySelector('.explanation');

    card.querySelectorAll('.option').forEach(el => {
      el.classList.remove('correct', 'wrong');
    });

    const correctIndex = q.answer;
    const correctOptionEl = card.querySelector(`.option[data-index="${correctIndex}"]`);
    if (correctOptionEl) correctOptionEl.classList.add('correct');

    if (selected) {
      const chosenIndex = parseInt(selected.value, 10);
      if (chosenIndex === correctIndex) {
        correctCount += 1;
      } else {
        const chosenEl = card.querySelector(`.option[data-index="${chosenIndex}"]`);
        if (chosenEl) chosenEl.classList.add('wrong');
      }
    }
    explanation.style.display = 'block';
  });

  submitBtn.disabled = true;
  nextBtn.hidden = false;
  saveScoreBtn.hidden = !currentUser;

  const scoreBar = document.createElement('div');
  scoreBar.className = 'card result-bar';
  scoreBar.innerHTML = `<div class="score">Score: ${correctCount} / ${currentSet.length}</div>
                        <div class="score-detail">${Math.round((correctCount / currentSet.length) * 100)}%</div>`;
  quizArea.insertBefore(scoreBar, quizArea.firstChild);
  scoreBar.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // attach score to save button dataset
  saveScoreBtn.dataset.score = correctCount;
}

loadBtn.addEventListener('click', async () => {
  try {
    if (allQuestions.length === 0) await loadQuestions();
    const exam = examSelect.value;
    const pick = pickRandomQuestions(exam);
    if (pick.error) {
      quizArea.innerHTML = `<div class="card"><p style="color:var(--danger)">${pick.error}</p></div>`;
      return;
    }
    currentSet = pick;
    renderQuiz(currentSet);
  } catch (e) { /* handled */ }
});

shuffleBtn.addEventListener('click', async () => {
  try {
    if (allQuestions.length === 0) await loadQuestions();
    const exam = examSelect.value;
    const pick = pickRandomQuestions(exam);
    if (pick.error) {
      quizArea.innerHTML = `<div class="card"><p style="color:var(--danger)">${pick.error}</p></div>`;
      return;
    }
    currentSet = pick;
    renderQuiz(currentSet);
  } catch (e) {}
});

submitBtn.addEventListener('click', () => grade());

nextBtn.addEventListener('click', () => {
  const exam = examSelect.value;
  const pick = pickRandomQuestions(exam);
  if (pick.error) {
    quizArea.innerHTML = `<div class="card"><p style="color:var(--danger)">${pick.error}</p></div>`;
    return;
  }
  currentSet = pick;
  renderQuiz(currentSet);
});

// save score to Firestore (requires authenticated user)
saveScoreBtn.addEventListener('click', async () => {
  if (!currentUser) { alert('Sign in first to save your score'); return; }
  const score = Number(saveScoreBtn.dataset.score || 0);
  try {
    await addDoc(collection(db, 'scores'), {
      uid: currentUser.uid,
      email: currentUser.email || null,
      score,
      total: currentSet.length,
      exam: examSelect.value,
      createdAt: serverTimestamp()
    });
    alert('Score saved');
    saveScoreBtn.hidden = true;
  } catch (err) {
    console.error('Save failed', err);
    alert('Failed to save score: ' + (err.message || err));
  }
});

// preload questions on init
(async function init() {
  try {
    await loadQuestions();
    // initial auto-load
    currentSet = pickRandomQuestions('all');
    if (!currentSet.error) renderQuiz(currentSet);
  } catch (e) {}
})();
