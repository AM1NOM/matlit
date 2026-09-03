// MathJax Configuration (Moved from HTML)
window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
    },
    svg: {
        fontCache: 'global'
    }
};

const BASE_URL = 'https://matlit.onrender.com/generate';

// 1. DOM Elements
const el = {
    topic: document.getElementById('topic-select'),
    difficulty: document.getElementById('difficulty-select'),
    fetchBtn: document.getElementById('fetch-btn'),
    question: document.getElementById('question-text'),
    answerSection: document.getElementById('answer-section'),
    userAns: document.getElementById('user-answer-input'),
    submitBtn: document.getElementById('submit-btn'),
    feedback: document.getElementById('feedback-box'),
    stepsBtn: document.getElementById('show-steps-btn'),
    stepsContainer: document.getElementById('steps-container'),
    stepsList: document.getElementById('steps-list')
};

let currentData = null;

// 2. Fetch Question
async function generateQuestion() {
    // Reset UI
    el.answerSection.hidden = el.stepsContainer.hidden = el.feedback.hidden = true;
    el.userAns.value = '';
    el.question.innerText = 'Loading...';

    try {
        const res = await fetch(`${BASE_URL}?topic=${el.topic.value}&difficulty=${el.difficulty.value}`, { method: 'POST' });

        // NEW: surface non-2xx responses instead of silently trying to parse them as JSON
        if (!res.ok) {
            const bodyText = await res.text();
            throw new Error(`Server responded ${res.status} ${res.statusText}: ${bodyText.slice(0, 200)}`);
        }

        currentData = await res.json();

        el.question.innerHTML = currentData.question;
        if (window.MathJax) MathJax.typesetPromise([el.question]); // Render Math

        el.answerSection.hidden = false;
    } catch (err) {
        // NEW: actually log the real error instead of swallowing it
        console.error('generateQuestion failed:', err);
        el.question.innerText = 'Failed to generate question.';
    }
}

// 3. Check Answer
function checkAnswer() {
    if (!currentData) return;

    // Simple cleanup: remove spaces and lowercase
    const userAns = el.userAns.value.replace(/\s+/g, '').toLowerCase();
    const correctAns = currentData.answer.replace(/\s+/g, '').toLowerCase();

    const isCorrect = (userAns === correctAns);
    el.feedback.hidden = false;
    el.feedback.className = `feedback-box ${isCorrect ? 'correct' : 'incorrect'}`;
    el.feedback.innerText = isCorrect ? 'Correct!' : 'Incorrect. Try again.';
}

// 4. Show/Hide Steps
function toggleSteps() {
    if (!currentData?.steps) return;

    const isHidden = el.stepsContainer.hidden;
    el.stepsContainer.hidden = !isHidden;
    el.stepsBtn.innerText = isHidden ? 'Hide Steps' : 'Show Steps';

    if (isHidden) {
        el.stepsList.innerHTML = currentData.steps.map(step => `<li>${step}</li>`).join('');
        if (window.MathJax) MathJax.typesetPromise([el.stepsList]);
    }
}

// Event Listeners
el.fetchBtn.addEventListener('click', generateQuestion);
el.submitBtn.addEventListener('click', checkAnswer);
el.stepsBtn.addEventListener('click', toggleSteps);