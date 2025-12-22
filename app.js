
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// add to your existing firestore imports
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// state for wrong-answers tracking
let userWrongSet = new Set();     // question IDs the user previously got wrong
let userWrongMap = new Map();     // questionId -> metadata (count, lastWrong)


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

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    // existing UI updates...
    await fetchUserWrongSet(user.uid);    // <-- add this
    // if you already have a quiz loaded, re-render to show highlights:
    if (currentSet && currentSet.length) renderQuiz(currentSet);
  } else {
    userWrongSet.clear();
    userWrongMap.clear();
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

// Fetch current user's wrong questions and fill userWrongSet & userWrongMap
async function fetchUserWrongSet(uid) {
  userWrongSet.clear();
  userWrongMap.clear();
  try {
    const coll = collection(db, 'users', uid, 'wrong_questions');
    const snapshot = await getDocs(coll);
    snapshot.forEach(docSnap => {
      const qid = docSnap.id;
      const data = docSnap.data();
      userWrongSet.add(qid);
      userWrongMap.set(qid, {
        count: data.count ?? 0,
        lastWrong: data.lastWrong ?? null,
        lastCorrect: data.lastCorrect ?? null
      });
    });
  } catch (err) {
    console.error('Failed to fetch user wrong set', err);
  }
}

// Save a wrong answer (increment counter). Creates the doc if missing.
async function saveWrongQuestion(uid, question) {
  if (!uid || !question?.id) return;
  const qid = question.id;
  const docRef = doc(db, 'users', uid, 'wrong_questions', qid);
  try {
    // Try update (increment). If it fails because doc doesn't exist, fallback to set.
    await updateDoc(docRef, {
      count: increment(1),
      lastWrong: serverTimestamp(),
      questionSnapshot: question.question ?? ''
    });
  } catch (err) {
    // If update failed because the doc doesn't exist, create it
    try {
      await setDoc(docRef, {
        count: 1,
        lastWrong: serverTimestamp(),
        questionSnapshot: question.question ?? ''
      });
    } catch (e) {
      console.error('Failed to set wrong question doc', e);
    }
  }
  // Update local caches for immediate UI feedback
  userWrongSet.add(qid);
  const prev = userWrongMap.get(qid) || { count: 0 };
  userWrongMap.set(qid, { ...prev, count: (prev.count || 0) + 1, lastWrong: new Date() });
}

// Optionally mark question as corrected (set lastCorrect). If you want to remove from wrong set, delete doc.
async function markQuestionCorrect(uid, question) {
  if (!uid || !question?.id) return;
  const qid = question.id;
  const docRef = doc(db, 'users', uid, 'wrong_questions', qid);
  try {
    // write lastCorrect; keep count
    await updateDoc(docRef, {
      lastCorrect: serverTimestamp()
    });
    // Optionally remove from user's wrong set locally but keep history
    userWrongSet.delete(qid);
    const meta = userWrongMap.get(qid) || {};
    userWrongMap.set(qid, { ...meta, lastCorrect: new Date() });
  } catch (err) {
    // if doc doesn't exist, nothing to mark
  }
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

    // --- Previously-missed badge (inserted immediately after card creation) ---
    try {
      if (currentUser && q.id && typeof userWrongSet !== 'undefined' && userWrongSet.has(q.id)) {
        card.classList.add('previously-wrong');

        const meta = userWrongMap.get(q.id) || {};
        const count = meta.count || 0;

        const badge = document.createElement('div');
        badge.className = 'score-badge';
        badge.textContent = `Previously missed (${count})`;
        badge.style.fontSize = '12px';
        badge.style.color = '#b91c1c';
        badge.style.marginBottom = '6px';

        card.appendChild(badge);
      }
    } catch (err) {
      // defensive: if userWrongMap/userWrongSet not available, fail silently
      console.error('Error checking previous wrong set:', err);
    }

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


async function grade() {
  const cards = Array.from(quizArea.querySelectorAll('.card'));
  let correctCount = 0;

  // Collect questions to update in Firestore
  const wrongQs = [];
  const correctedQs = [];

  cards.forEach((card, idx) => {
    const q = currentSet[idx];
    const selected = card.querySelector('input[type=radio]:checked');
    const explanation = card.querySelector('.explanation');

    // clear old state
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
        // if previously missed, mark as corrected
        if (currentUser && q.id && userWrongSet && userWrongSet.has(q.id)) {
          correctedQs.push(q);
        }
      } else {
        const chosenEl = card.querySelector(`.option[data-index="${chosenIndex}"]`);
        if (chosenEl) chosenEl.classList.add('wrong');
        // record wrong question
        if (currentUser && q.id) wrongQs.push(q);
      }
    } else {
      // no answer selected -> treat as wrong (you can change this behavior)
      if (currentUser && q.id) wrongQs.push(q);
    }

    // reveal explanation
    if (explanation) explanation.style.display = 'block';
  });

  // update UI
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

  // persist wrong/correct updates for the signed-in user
  if (currentUser) {
    const uid = currentUser.uid;
    const ops = [];

    // Save wrong questions (increment count)
    for (const wq of wrongQs) {
      // call helper; push promise and catch to avoid unhandled rejections
      ops.push(
        saveWrongQuestion(uid, wq).catch(err => {
          console.error('Failed to save wrong question', wq.id, err);
        })
      );
    }

    // Mark corrected questions (if they were previously missed)
    for (const cq of correctedQs) {
      ops.push(
        markQuestionCorrect(uid, cq).then(() => {
          // update local cache immediately so UI reflects change if you re-render
          try {
            userWrongSet.delete(cq.id);
            const prev = userWrongMap.get(cq.id) || {};
            userWrongMap.set(cq.id, { ...prev, lastCorrect: new Date() });
          } catch (e) { /* ignore */ }
        }).catch(err => {
          console.error('Failed to mark question correct', cq.id, err);
        })
      );
    }

    // wait for all writes to settle (non-fatal)
    try {
      await Promise.allSettled(ops);
    } catch (e) {
      // shouldn't reach here because we used allSettled, but keep defensive logging
      console.error('Unexpected error while saving question results', e);
    }
  }
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
