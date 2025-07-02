const SHEET_URL = "https://exp-xug8.onrender.com/submit";
const TEXTS_JSON = "texts.json";

let state = {
    currentStep: 0,
    totalSteps: 0,
    participantId: '',
    demographics: {},
    assignedTexts: [],
    currentTextIndex: 0,
    responses: {},
    startTime: Date.now(),
    timerInterval: null,
    timeLeft: 0
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

// Improved Latin Square implementation for better randomization
function createLatinSquare(texts) {
  // Create separate objects for narrative and expository versions
  const narrativeTexts = texts.map(text => ({
      ...text,
      type: 'narrative',
      content: text.narrative,
      expository: undefined // Remove expository to force narrative display
  }));
  
  const expositoryTexts = texts.map(text => ({
      ...text,
      type: 'expository', 
      content: text.expository,
      narrative: undefined // Remove narrative to force expository display
  }));
  
  // Create participant-specific rotation based on their ID and timestamp
  const participantSeed = parseInt(state.participantId.substr(-4), 36);
  const timeBasedSeed = Math.floor(Date.now() / 10000);
  const combinedSeed = participantSeed + timeBasedSeed;
  
  // Use different rotations for narrative and expository
  const narrativeRotation = combinedSeed % narrativeTexts.length;
  const expositoryRotation = (combinedSeed + 3) % expositoryTexts.length;
  
  const selectedTexts = [];
  
  // Select 2 narratives and 2 expositories with rotation
  for (let i = 0; i < 2; i++) {
      selectedTexts.push(narrativeTexts[(narrativeRotation + i) % narrativeTexts.length]);
      selectedTexts.push(expositoryTexts[(expositoryRotation + i) % expositoryTexts.length]);
  }
  
  // Shuffle the selected texts using the participant seed
  for (let i = selectedTexts.length - 1; i > 0; i--) {
      const j = (participantSeed + i) % (i + 1);
      [selectedTexts[i], selectedTexts[j]] = [selectedTexts[j], selectedTexts[i]];
  }
  
  return selectedTexts;
}


function showConsent() {
    showContainer(`
        <h2>Consent Form</h2>
        <p>This experiment is conducted by <strong>Richárd Reichardt and Mohammed Naser Al-Moqdad</strong> as part of a research project. Your participation is voluntary and anonymous.</p>
        <p>You will be asked to read several texts and answer questions about them. <strong>You will have exactly 5 minutes to read each text.</strong> After the 5-minute timer expires, you will automatically proceed to answer questions about that text. The entire experiment will take approximately 15-20 minutes.</p>
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

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showText() {
  const currentText = state.assignedTexts[state.currentTextIndex];
  const textContent = currentText.content || currentText.narrative || currentText.expository;
  const textType = currentText.type || (currentText.narrative ? 'narrative' : 'expository');
  
  // Initialize timer
  state.timeLeft = 300; // 5 minutes in seconds
  
  showContainer(`
      <h2>Text ${state.currentTextIndex + 1} of ${state.assignedTexts.length}</h2>
      
      <div class="timer-container">
          <div class="timer-display">
              <strong>Time Remaining: <span id="timer-text">${formatTime(state.timeLeft)}</span></strong>
          </div>
          <div class="timer-bar-bg">
              <div id="timer-bar" class="timer-bar-fg"></div>
          </div>
      </div>
      
      <div class="text-container">
          <h3>${currentText.title}</h3>
          <p class="text-type">Type: ${textType}</p>
          <div class="text-content">${textContent}</div>
      </div>
      
      <form id="text-form">
          <button type="submit" id="continue-btn">Continue to Questions</button>
      </form>
  `);
  
  startTimer();
  
  document.getElementById('text-form').addEventListener('submit', function(e) {
      e.preventDefault();
      clearInterval(state.timerInterval);
      state.currentStep++;
      showQuestions();
  });
}


function startTimer() {
    const timerText = document.getElementById('timer-text');
    const timerBar = document.getElementById('timer-bar');
    const continueBtn = document.getElementById('continue-btn');
    
    state.timerInterval = setInterval(function() {
        state.timeLeft--;
        
        // Update timer display
        timerText.textContent = formatTime(state.timeLeft);
        
        // Update timer bar
        const percentage = (state.timeLeft / 300) * 100;
        timerBar.style.width = percentage + '%';
        
        // Change colors as time runs out
        if (state.timeLeft <= 60) {
            timerBar.style.backgroundColor = '#ef4444'; // Red
            timerText.style.color = '#ef4444';
        } else if (state.timeLeft <= 120) {
            timerBar.style.backgroundColor = '#f59e0b'; // Orange
            timerText.style.color = '#f59e0b';
        }
        
        // Auto-advance when timer reaches zero
        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            timerText.textContent = "Time's up!";
            continueBtn.textContent = "Proceed to Questions";
            continueBtn.style.backgroundColor = '#ef4444';
            
            // Auto-submit after 2 seconds
            setTimeout(function() {
                document.getElementById('text-form').dispatchEvent(new Event('submit'));
            }, 2000);
        }
    }, 1000);
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
            
            <p>If you have any questions, contact Richard Reichardt at <a href="mailto:reichardt.richard@ppk.elte.hu">reichardt.richard@ppk.elte.hu</a> or Mohammed Naser Al-Moqdad at <a href="mailto:reichardt.richard@ppk.elte.hu">naser@student.elte.hu</a>.</p>
            
            <div id="submission-status">
                <p id="submission-message">Submitting your data...</p>
                <div id="submission-spinner" class="spinner"></div>
            </div>
        </div>
    `);
    
    submitData();
}

async function submitData() {
  // Create data object matching EXACT sheet column headers
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

  // Log the data being sent for debugging
  console.log('Submitting data:', submissionData);
  console.log('Assigned texts for this participant:', state.assignedTexts.map(t => t.title));
  
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
        
        console.log('Assigned texts for participant', state.participantId, ':', state.assignedTexts.map(t => t.title));
        
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
