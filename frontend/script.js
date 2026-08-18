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

// Helper: Determine if a specific word/token is a math expression
function isMathToken(token) {
    if (!token.trim()) return false;
    
    // If it contains math operators or parentheses
    if (/[*+\-=\/∫^()]/.test(token)) return true;
    // If it contains numbers
    if (/[0-9]/.test(token)) return true;
    
    // If it's a specific math variable or function (ignoring attached punctuation)
    let clean = token.replace(/^[.,:]+|[.,:]+$/g, '');
    if (['x', 'y', 'z', 'C', 'dx', 'dy', 'sin', 'cos', 'tan', 'exp', 'log', 'ln'].includes(clean)) return true;
    
    return false;
}

// Helper: Formats only the math parts into clean LaTeX
function formatMath(text) {
    let formatted = text;
    
    // Convert exp(something) to e^{something}
    formatted = formatted.replace(/\bexp\(([^)]+)\)/g, 'e^{$1}');
    
    // Convert Python exponents (**) to LaTeX exponents (^)
    formatted = formatted.replace(/\*\*(\([^)]+\))/g, '^{$1}'); // e.g. **(x+1) -> ^{(x+1)}
    formatted = formatted.replace(/\*\*([a-zA-Z0-9]+)/g, '^{$1}'); // e.g. **3 -> ^{3}
    formatted = formatted.replace(/\*\*/g, '^'); // fallback
    
    // Convert multiplication to a dot with spacing
    formatted = formatted.replace(/\*/g, ' \\cdot ');
    
    // Convert trig functions to standard LaTeX upright font
    formatted = formatted.replace(/\b(sin|cos|tan|csc|sec|cot|log|ln)\b/g, '\\$1');
    
    // Convert integral signs and add spacing for dx
    formatted = formatted.replace(/∫/g, '\\int ');
    formatted = formatted.replace(/\bdx\b/g, '\\,dx');
    
    return formatted;
}

// Core Engine: Separates English text from Math formulas so both look correct
function processMixedText(text, useDisplayMath = false) {
    let tokens = text.split(/(\s+)/); // Split by spaces, keeping the spaces
    let result = '';
    let mathMode = false;
    let mathBuffer = '';
    
    const openTag = useDisplayMath ? '\\[' : '\\(';
    const closeTag = useDisplayMath ? '\\]' : '\\)';
    
    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        if (!token.trim()) {
            if (mathMode) mathBuffer += token;
            else result += token;
            continue;
        }
        
        if (isMathToken(token)) {
            if (!mathMode) {
                mathMode = true;
                mathBuffer = token;
            } else {
                mathBuffer += token;
            }
        } else {
            if (mathMode) {
                let trailingSpace = mathBuffer.match(/\s+$/);
                if (trailingSpace) mathBuffer = mathBuffer.replace(/\s+$/, '');
                
                result += `${openTag} ${formatMath(mathBuffer)} ${closeTag}`;
                if (trailingSpace) result += trailingSpace[0];
                
                mathMode = false;
                mathBuffer = '';
            }
            result += token;
        }
    }
    
    if (mathMode) {
        result += `${openTag} ${formatMath(mathBuffer)} ${closeTag}`;
    }
    
    return result;
}

async function renderMathInElement(element) {
    if (window.MathJax && window.MathJax.typesetPromise) {
        try {
            await MathJax.typesetPromise([element]);
        } catch (err) {
            console.error('MathJax error:', err);
        }
    }
}

async function generateQuestion() {
    const topic = topicSelect.value;
    const difficulty = difficultySelect.value;
    const url = `${BASE_URL}?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`;

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

        if (!response.ok) throw new Error(`Server status: ${response.status}`);
        
        currentData = await response.json();

        // Process the question (true = use centered display math)
        questionText.innerHTML = processMixedText(currentData.question, true);
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

    if (stepsContainer.hidden) {
        stepsList.innerHTML = '';

        currentData.steps.forEach(stepText => {
            const li = document.createElement('li');
            // Process the step (false = use inline math so it flows with the text)
            li.innerHTML = processMixedText(stepText, false);
            stepsList.appendChild(li);
        });

        stepsContainer.hidden = false;
        showStepsBtn.innerText = 'Hide Step-by-Step Solution';
        await renderMathInElement(stepsList);
    } else {
        stepsContainer.hidden = true;
        showStepsBtn.innerText = 'Show Step-by-Step Solution';
    }
}

fetchBtn.addEventListener('click', generateQuestion);
submitBtn.addEventListener('click', checkAnswer);
showStepsBtn.addEventListener('click', toggleSteps);