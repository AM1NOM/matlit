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

// Convert Python raw math string into valid LaTeX
function convertToLaTeX(text) {
    if (!text) return '';

    let formatted = text;

    // Convert exponent notation x**3 -> x^{3} or (expr)**3 -> (expr)^{3}
    formatted = formatted.replace(/([a-zA-Z0-9_()]+)\*\*([a-zA-Z0-9_-]+)/g, '$1^{$2}');

    // Convert explicit multiplication * to LaTeX spacing or implicit multiplication
    formatted = formatted.replace(/\*/g, ' ');

    // Convert trig functions to LaTeX commands
    formatted = formatted.replace(/\b(sin|cos|tan|csc|sec|cot|log|ln)\b/g, '\\$1');

    // Convert integral signs and differentials
    formatted = formatted.replace(/∫/g, '\\int ');
    formatted = formatted.replace(/\bdx\b/g, '\\,dx');

    return formatted;
}

// Trigger MathJax re-render for dynamically added HTML
async function renderMathInElement(element) {
    if (window.MathJax && window.MathJax.typesetPromise) {
        try {
            await MathJax.typesetPromise([element]);
        } catch (err) {
            console.error('MathJax rendering error:', err);
        }
    }
}

async function generateQuestion() {
    const topic = topicSelect.value;
    const difficulty = difficultySelect.value;

    const url = `${BASE_URL}?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`;

    // Reset UI state
    errorMsg.hidden = true;
    answerSection.hidden = true;
    stepsContainer.hidden = true;
    feedbackBox.hidden = true;
    userAnswerInput.value = '';
    showStepsBtn.innerText = 'Show Step-by-Step Solution';
    fetchBtn.disabled = true;
    questionText.innerText = 'Generating question...';

    try {
        const response = await fetch(url, { method: 'POST' });

        if (!response.ok) {
            throw new Error(`Server status: ${response.status}`);
        }

        currentData = await response.json();

        // Convert question to LaTeX display equation
        const latexQuestion = convertToLaTeX(currentData.question);
        questionText.innerHTML = `\\[ ${latexQuestion} \\]`;

        await renderMathInElement(questionText);
        answerSection.hidden = false;

    } catch (error) {
        questionText.innerText = 'Failed to generate question.';
        errorMsg.innerText = `Error: ${error.message}`;
        errorMsg.hidden = false;
    } finally {
        fetchBtn.disabled = false;
    }
}

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

async function toggleSteps() {
    if (!currentData || !currentData.steps) return;

    const isHidden = stepsContainer.hidden;

    if (isHidden) {
        stepsList.innerHTML = '';

        // Build list items with individual LaTeX expressions
        currentData.steps.forEach(stepText => {
            const li = document.createElement('li');
            const latexStep = convertToLaTeX(stepText);
            
            // Wrap step in inline MathJax brackets
            li.innerHTML = `\\(${latexStep}\\)`;
            stepsList.appendChild(li);
        });

        // Unhide container BEFORE triggering MathJax typeset
        stepsContainer.hidden = false;
        showStepsBtn.innerText = 'Hide Step-by-Step Solution';

        // Re-render math inside the steps list
        await renderMathInElement(stepsList);
    } else {
        stepsContainer.hidden = true;
        showStepsBtn.innerText = 'Show Step-by-Step Solution';
    }
}

fetchBtn.addEventListener('click', generateQuestion);
submitBtn.addEventListener('click', checkAnswer);
showStepsBtn.addEventListener('click', toggleSteps);