const BASE_URL = 'https://matlit.onrender.com/generate';

const topicSelect = document.getElementById('topic-select');
const difficultySelect = document.getElementById('difficulty-select');
const fetchBtn = document.getElementById('fetch-btn');
const questionText = document.getElementById('question-text');
const errorMsg = document.getElementById('error-msg');

const answerSection = document.getElementById('answer-section');
const userAnswerInput = document.getElementById('user-answer-input');
const submitBtn = document.getElementById('submit-btn');
const feedbackBox = document.getElementById('feedback-box');
const showStepsBtn = document.getElementById('show-steps-btn');
const stepsContainer = document.getElementById('steps-container');
const stepsList = document.getElementById('steps-list');

let currentData = null;

// Convert Python math notation to LaTeX for rendering
function formatMathToLaTeX(text) {
    if (!text) return '';
    return text
        .replace(/∫/g, '\\int ')
        .replace(/\*\*/g, '^')
        .replace(/\*/g, ' ')
        .replace(/dx/g, ' \\, dx');
}

// Render math elements on screen using MathJax
function renderMath() {
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

async function generateQuestion() {
    const topic = topicSelect.value;
    const difficulty = difficultySelect.value;

    const url = `${BASE_URL}?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`;

    // Reset state
    errorMsg.hidden = true;
    answerSection.hidden = true;
    stepsContainer.hidden = true;
    feedbackBox.hidden = true;
    userAnswerInput.value = '';
    fetchBtn.disabled = true;
    questionText.innerText = 'Generating question...';

    try {
        const response = await fetch(url, { method: 'POST' });

        if (!response.ok) {
            throw new Error(`Server status: ${response.status}`);
        }

        currentData = await response.json();

        // Render formatted question LaTeX
        const formattedQuestion = formatMathToLaTeX(currentData.question);
        questionText.innerHTML = `\\[ ${formattedQuestion} \\]`;
        
        renderMath();
        answerSection.hidden = false;

    } catch (error) {
        questionText.innerText = 'Failed to generate question.';
        errorMsg.innerText = `Error: ${error.message}`;
        errorMsg.hidden = false;
    } finally {
        fetchBtn.disabled = false;
    }
}

// Clean string for checking basic equality
function normalizeString(str) {
    return str.replace(/\s+/g, '').replace(/\*\*/g, '^').toLowerCase();
}

function checkAnswer() {
    if (!currentData) return;

    const userAns = normalizeString(userAnswerInput.value);
    const correctAns = normalizeString(currentData.answer);

    feedbackBox.hidden = false;

    if (userAns === correctAns) {
        feedbackBox.className = 'feedback-box correct';
        feedbackBox.innerText = 'Correct!';
    } else {
        feedbackBox.className = 'feedback-box incorrect';
        feedbackBox.innerText = 'Incorrect. Try again or view the solution steps.';
    }
}

function toggleSteps() {
    if (!currentData || !currentData.steps) return;

    const isHidden = stepsContainer.hidden;

    if (isHidden) {
        stepsList.innerHTML = '';
        currentData.steps.forEach(step => {
            const li = document.createElement('li');
            const formattedStep = formatMathToLaTeX(step);
            li.innerHTML = `\\(${formattedStep}\\)`;
            stepsList.appendChild(li);
        });

        renderMath();
        stepsContainer.hidden = false;
        showStepsBtn.innerText = 'Hide Step-by-Step Solution';
    } else {
        stepsContainer.hidden = true;
        showStepsBtn.innerText = 'Show Step-by-Step Solution';
    }
}

fetchBtn.addEventListener('click', generateQuestion);
submitBtn.addEventListener('click', checkAnswer);
showStepsBtn.addEventListener('click', toggleSteps);