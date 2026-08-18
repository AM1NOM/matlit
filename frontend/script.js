const BASE_URL = 'https://matlit.onrender.com/generate';

const difficultySelect = document.getElementById('difficulty-select');
const fetchBtn = document.getElementById('fetch-btn');
const questionText = document.getElementById('question-text');
const errorMsg = document.getElementById('error-msg');

async function generateQuestion() {
    const topic = 'integration';
    const difficulty = difficultySelect.value;
    
    // Construct request URL with parameters
    const url = `${BASE_URL}?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`;

    // Reset UI state
    errorMsg.hidden = true;
    fetchBtn.disabled = true;
    questionText.innerText = 'Generating question...';

    try {
        const response = await fetch(url, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`Server status: ${response.status}`);
        }

        const data = await response.json();

        // Handle string response or object response
        if (typeof data === 'string') {
            questionText.innerText = data;
        } else if (data.question) {
            questionText.innerText = data.question;
        } else {
            questionText.innerText = JSON.stringify(data);
        }

    } catch (error) {
        questionText.innerText = 'Failed to generate question.';
        errorMsg.innerText = `Error: ${error.message}. (Note: Free tier instances on Render take ~50s to wake up if inactive)`;
        errorMsg.hidden = false;
    } finally {
        fetchBtn.disabled = false;
    }
}

fetchBtn.addEventListener('click', generateQuestion);