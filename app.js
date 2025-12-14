// app.js - MatLib frontend logic (vanilla JS, module)
const QUESTIONS_URL = 'questions.json'; // hosted JSON file (see sample below)
const QUIZ_SIZE = 5;

const examSelect = document.getElementById('examSelect');
const loadBtn = document.getElementById('loadBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const quizArea = document.getElementById('quizArea');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');

let allQuestions = [];
let currentSet = [];

// Utility: Fisher-Yates shuffle, returns new array
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadQuestions() {
  try {
    const res = await fetch(QUESTIONS_URL, {cache: "no-store"});
    if (!res.ok) throw new Error(`Failed to load questions (${res.status})`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('questions.json must be an array');
    allQuestions = json;
    return json;
  } catch (err) {
    console.error(err);
    quizArea.innerHTML = `<div class="card"><p style="color:var(--danger)">Unable to load questions.json: ${err.message}</p>
      <p>If you're testing locally, run a local static server (e.g. <code>python -m http.server</code>) instead of opening the file directly.</p></div>`;
    throw err;
  }
}

function pickRandomQuestions(exam) {
  let pool = allQuestions;
  if (exam && exam !== 'all') {
    pool = allQuestions.filter(q => q.exam === exam);
  }
  if (pool.length < QUIZ_SIZE) {
    // Not enough questions available
    return {error: `Not enough questions for ${exam}. Found ${pool.length}, need ${QUIZ_SIZE}.`};
  }
  return shuffle(pool).slice(0, QUIZ_SIZE);
}

function renderQuiz(questions) {
  quizArea.innerHTML = '';
  submitBtn.disabled = false;
  nextBtn.hidden = true;

  questions.forEach((q, idx) => {
    // Create a card per question
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

    // hidden explanation area (revealed on submit)
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

    // clear old state
    card.querySelectorAll('.option').forEach(el => {
      el.classList.remove('correct', 'wrong');
    });

    const correctIndex = q.answer;
    // mark correct option
    const correctOptionEl = card.querySelector(`.option[data-index="${correctIndex}"]`);
    if (correctOptionEl) {
      correctOptionEl.classList.add('correct');
    }

    if (selected) {
      const chosenIndex = parseInt(selected.value, 10);
      if (chosenIndex === correctIndex) {
        correctCount += 1;
        // mark the chosen one as correct too (already set)
      } else {
        // mark chosen wrong
        const chosenEl = card.querySelector(`.option[data-index="${chosenIndex}"]`);
        if (chosenEl) chosenEl.classList.add('wrong');
      }
    } else {
      // user didn't select an answer; show as wrong (only correct gets highlight)
    }

    // reveal explanation
    explanation.style.display = 'block';
  });

  submitBtn.disabled = true;
  nextBtn.hidden = false;

  // show overall score at top
  const scoreBar = document.createElement('div');
  scoreBar.className = 'card result-bar';
  scoreBar.innerHTML = `
    <div class="score">Score: ${correctCount} / ${currentSet.length}</div>
    <div class="score-detail">${Math.round((correctCount / currentSet.length) * 100)}%</div>
  `;
  // insert result at the top of quizArea (before questions)
  quizArea.insertBefore(scoreBar, quizArea.firstChild);

  // scroll to score
  scoreBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function attachEventHandlers() {
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
    } catch (e) {
      // error already shown in loadQuestions
    }
  });

  shuffleBtn.addEventListener('click', async () => {
    // shuffle new set with the currently selected exam
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

  submitBtn.addEventListener('click', () => {
    grade();
  });

  nextBtn.addEventListener('click', () => {
    // load a fresh set keeping the same exam choice
    const exam = examSelect.value;
    const pick = pickRandomQuestions(exam);
    if (pick.error) {
      quizArea.innerHTML = `<div class="card"><p style="color:var(--danger)">${pick.error}</p></div>`;
      return;
    }
    currentSet = pick;
    renderQuiz(currentSet);
  });
}

async function init() {
  attachEventHandlers();
  // try to pre-load
  try {
    await loadQuestions();
    // auto-load 5 from "all"
    currentSet = pickRandomQuestions('all');
    if (!currentSet.error) renderQuiz(currentSet);
  } catch (e) {
    // already handled
  }
}

init();
