// Configuration
const SHEET_URL = "https://your-render-proxy-url.onrender.com/submit"; // Replace with your actual Render proxy URL
const TEXTS_JSON = "texts.json";

// Global state
let state = {
    currentStep: 0,
    totalSteps: 0,
    participantId: '',
    demographics: {},
    assignedTexts: [],
    currentTextIndex: 0,
    responses: {},
    startTime: Date.now()
};

// Utility functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function updateProgress() {
    const progress = ((state.currentStep / state.totalSteps) * 100);
    document.getElementById('progress-bar').style.width = progress + '%';
}

function showContainer(html) {
    document.getElementById('container').innerHTML = html;
    updateProgress();
}

// Latin Square implementation for balanced assignment
function createLatinSquare(texts) {
    const narratives = texts.filter(t => t.narrative);
    const expositories = texts.filter(t => t.expository);
    
    // Simple rotation method for Latin square
    const rotation = Math.floor(Math.random() * narratives.length);
    
    // Select 2 narratives and 2 expositories
    const selectedTexts = [];
    for (let i = 0; i < 2; i++) {
        selectedTexts.push(narratives[(rotation + i) % narratives.length]);
        selectedTexts.push(expositories[(rotation + i) % expositories.length]);
    }
    
    // Shuffle the selected texts
    for (let i = selectedTexts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedTexts[i], selectedTexts[j]] = [selectedTexts[j], selectedTexts[i]];
    }
    
    return selectedTexts;
}

// Page rendering functions
function showConsent() {
    showContainer(`
        <h2>Consent Form</h2>
        <p>This experiment is part of a research project by <strong>Mohammed Nasser Al Moqdad</strong>. Your participation is voluntary and anonymous.</p>
        <p>You will be asked to read several texts and answer questions about them. The experiment will take approximately 15-20 minutes.</p>
        <form id="consent-form">
            <label>
                <input type="checkbox" id="consent-checkbox" required>
                I have read and understood the above information and consent to participate in this study.
            </label>
            <button type="submit">Begin Experiment</button>
        </form>
    `);
    
    document.getElementById('consent-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (document.getElementById('consent-checkbox').checked) {
            state.currentStep++;
            showDemographics();
        }
    });
}

function showDemographics() {
    showContainer(`
        <h2>Participant Information</h2>
        <form id="demographics-form">
            <label>
                Age:
                <input type="number" id="age" min="18" max="99" required>
            </label>
            
            <label>
                English Fluency (1=not fluent, 5=native):
                <select id="fluency" required>
                    <option value="">Select fluency level</option>
                    <option value="1">1 - Not fluent</option>
                    <option value="2">2 - Somewhat fluent</option>
                    <option value="3">3 - Average fluency</option>
                    <option value="4">4 - Very fluent</option>
                    <option value="5">5 - Native speaker</option>
                </select>
            </label>
            
            <button type="submit">Continue</button>
        </form>
    `);
    
    document.getElementById('demographics-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        state.demographics = {
            age: document.getElementById('age').value,
            fluency: document.getElementById('fluency').value
        };
        
        state.currentStep++;
        showText();
    });
}

function showText() {
    const currentText = state.assignedTexts[state.currentTextIndex];
    const textContent = currentText.narrative || currentText.expository;
    const textType = currentText.narrative ? 'narrative' : 'expository';
    
    showContainer(`
        <h2>Text ${state.currentTextIndex + 1} of ${state.assignedTexts.length}</h2>
        <div class="text-container">
            <h3>${currentText.title}</h3>
            <p class="text-type">Type: ${textType}</p>
            <div class="text-content">${textContent}</div>
        </div>
        <form id="text-form">
            <button type="submit">Continue to Questions</button>
        </form>
    `);
    
    document.getElementById('text-form').addEventListener('submit', function(e) {
        e.preventDefault();
        state.currentStep++;
        showQuestions();
    });
}

function showQuestions() {
    const currentText = state.assignedTexts[state.currentTextIndex];
    
    let questionsHtml = '<h2>Questions</h2><form id="questions-form">';
    
    currentText.questions.forEach((question, index) => {
        questionsHtml += `
            <div class="question-item">
                <label>
                    ${index + 1}. ${question}
                    <textarea id="q${index}" rows="3" required></textarea>
                </label>
            </div>
        `;
    });
    
    questionsHtml += '<button type="submit">Submit Answers</button></form>';
    
    showContainer(questionsHtml);
    
    document.getElementById('questions-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Collect answers
        const answers = [];
        currentText.questions.forEach((question, index) => {
            answers.push(document.getElementById(`q${index}`).value);
        });
        
        // Determine column name based on text type and index
        const textType = currentText.narrative ? 'N' : 'E';
        const textNumber = getTextNumber(currentText, textType);
        const columnName = textType + textNumber;
        
        state.responses[columnName] = answers;
        
        state.currentTextIndex++;
        state.currentStep++;
        
        if (state.currentTextIndex < state.assignedTexts.length) {
            showText();
        } else {
            showCompletion();
        }
    });
}

function getTextNumber(currentText, textType) {
    // Map text titles to numbers
    const textMapping = {
        'Hindenburg disaster': textType === 'N' ? 1 : 1,
        'The Invention of the Birth Control Pill': textType === 'N' ? 2 : 2,
        'Three Christs of Ypsilanti': textType === 'N' ? 3 : 3,
        'Discovery of blood types (Karl Landsteiner)': textType === 'N' ? 4 : 4,
        'Discovery behind penicillin': textType === 'N' ? 5 : 5,
        'The Invention of the Printing Press': textType === 'N' ? 6 : 6,
        'The Gold Standard': textType === 'N' ? 7 : 7,
        'The Zimmerman Telegram': textType === 'N' ? 8 : 8
    };
    
    return textMapping[currentText.title] || 1;
}

function showCompletion() {
    showContainer(`
        <h2>Thank You!</h2>
        <p>Your responses have been recorded. Thank you for participating in this study.</p>
        <p>You may now close this browser window.</p>
    `);
    
    // Submit data
    submitData();
}

function submitData() {
    const submissionData = {
        timestamp: new Date().toISOString(),
        participantid: state.participantId,
        age: state.demographics.age,
        fluency: state.demographics.fluency,
        N1: state.responses.N1 || '',
        E1: state.responses.E1 || '',
        N2: state.responses.N2 || '',
        E2: state.responses.E2 || '',
        N3: state.responses.N3 || '',
        E3: state.responses.E3 || '',
        N4: state.responses.N4 || '',
        E4: state.responses.E4 || '',
        N5: state.responses.N5 || '',
        E5: state.responses.E5 || '',
        N6: state.responses.N6 || '',
        E6: state.responses.E6 || '',
        N7: state.responses.N7 || '',
        E7: state.responses.E7 || '',
        N8: state.responses.N8 || ''
    };
    
    fetch(SHEET_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
    }).catch(error => {
        console.error('Error submitting data:', error);
    });
}

// Initialize the experiment
async function initExperiment() {
    try {
        // Load texts from JSON
        const response = await fetch(TEXTS_JSON);
        const texts = await response.json();
        
        // Generate participant ID
        state.participantId = generateId();
        
        // Assign texts using Latin square
        state.assignedTexts = createLatinSquare(texts);
        
        // Calculate total steps
        state.totalSteps = 2 + (state.assignedTexts.length * 2); // consent + demographics + (text + questions) for each text
        
        // Start the experiment
        showConsent();
        
    } catch (error) {
        console.error('Error initializing experiment:', error);
        showContainer(`
            <h2>Error</h2>
            <p>Sorry, there was an error loading the experiment. Please refresh the page and try again.</p>
        `);
    }
}

// Start when page loads
document.addEventListener('DOMContentLoaded', initExperiment);
