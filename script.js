const SHEET_URL = "https://your-actual-render-url.onrender.com/submit"; // Replace with your actual Render URL
const TEXTS_JSON = "texts.json";

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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2).toUpperCase();
}

function updateProgress() {
    const progress = ((state.currentStep / state.totalSteps) * 100);
    document.getElementById('progress-bar').style.width = progress + '%';
}

function showContainer(html) {
    document.getElementById('container').innerHTML = html;
    updateProgress();
}

function createLatinSquare(texts) {
    const narratives = texts.filter(t => t.narrative);
    const expositories = texts.filter(t => t.expository);
    
    const rotation = Math.floor(Math.random() * narratives.length);
    
    const selectedTexts = [];
    for (let i = 0; i < 2; i++) {
        selectedTexts.push(narratives[(rotation + i) % narratives.length]);
        selectedTexts.push(expositories[(rotation + i) % expositories.length]);
    }
    
    for (let i = selectedTexts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedTexts[i], selectedTexts[j]] = [selectedTexts[j], selectedTexts[i]];
    }
    
    return selectedTexts;
}

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
        
        const answers = [];
        currentText.questions.forEach((question, index) => {
            answers.push(document.getElementById(`q${index}`).value);
        });
        
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
    const textMapping = {
        'Hindenburg disaster': 1,
        'The Invention of the Birth Control Pill': 2,
        'Three Christs of Ypsilanti': 3,
        'Discovery of blood types (Karl Landsteiner)': 4,
        'Discovery behind penicillin': 5,
        'The Invention of the Printing Press': 6,
        'The Gold Standard': 7,
        'The Zimmerman Telegram': 8
    };
    
    return textMapping[currentText.title] || 1;
}

function showCompletion() {
    showContainer(`
        <div class="completion-message">
            <h2>You have completed the experiment.</h2>
            
            <div class="participant-code">
                <p><strong>Your participant code is: <span id="participant-code">${state.participantId}</span></strong></p>
            </div>
            
            <p>If you have any questions, contact Richard Reichardt at <a href="mailto:reichardt.richard@ppk.elte.hu">reichardt.richard@ppk.elte.hu</a>.</p>
            
            <div id="submission-status">
                <p id="submission-message">Submitting your data...</p>
                <div id="submission-spinner" class="spinner"></div>
            </div>
        </div>
    `);
    
    // Submit data
    submitData();
}

async function submitData() {
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
    
    try {
        const response = await fetch(SHEET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            document.getElementById('submission-message').innerHTML = '<strong style="color: green;">Data submitted successfully!</strong>';
            document.getElementById('submission-spinner').style.display = 'none';
        } else {
            throw new Error(result.error || 'Submission failed');
        }
        
    } catch (error) {
        console.error('Error submitting data:', error);
        document.getElementById('submission-message').innerHTML = `
            <strong style="color: red;">Failed to submit data.</strong><br>
            <small>Error: ${error.message}</small><br>
            <small>Please save your participant code: <strong>${state.participantId}</strong></small>
        `;
        document.getElementById('submission-spinner').style.display = 'none';
    }
}

async function initExperiment() {
    try {
        const response = await fetch(TEXTS_JSON);
        const texts = await response.json();
        
        state.participantId = generateId();
        state.assignedTexts = createLatinSquare(texts);
        state.totalSteps = 2 + (state.assignedTexts.length * 2);
        
        showConsent();
        
    } catch (error) {
        console.error('Error initializing experiment:', error);
        showContainer(`
            <h2>Error</h2>
            <p>Sorry, there was an error loading the experiment. Please refresh the page and try again.</p>
        `);
    }
}

document.addEventListener('DOMContentLoaded', initExperiment);
