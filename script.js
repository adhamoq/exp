// Experiment configuration and state
const JSON_URL = "https://api.jsonsilo.com/public/26c41b8c-31a3-4bc0-a421-f9ecf9678003";
const FORM_POST_URL = "https://script.google.com/macros/s/AKfycbxuEEHDR_5mggc3XKlwTSxw2tK664M_Rxry_gAYg9Llyc-AF46eCVpNzk1cz0jI8hKx/exec";
const TIMER_DURATION_MS = 5 * 60 * 1000; // 5 minutes timer

let state = {
  page: "intro", // 'intro', 'metadata', 'text', 'questions', 'familiarity', 'thanks'
  participantId: generateParticipantId(),
  metadata: {},
  data: [],
  texts: [],
  currentTextIndex: 0,
  timer: null,
  timerRemaining: TIMER_DURATION_MS,
};

const container = document.getElementById("container");
const progressBar = document.getElementById("progress-bar");

// Utility: generate unique participant ID
function generateParticipantId() {
  return 'P-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Utility: format time mm:ss
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Load JSON texts
async function loadTexts() {
  try {
    const resp = await fetch(JSON_URL);
    if (!resp.ok) throw new Error("Failed to fetch JSON");
    const json = await resp.json();
    state.texts = json;
  } catch (e) {
    container.innerHTML = `<p style="color:red;">Error loading texts: ${e.message}</p>`;
  }
}

// Render progress bar
function updateProgressBar() {
  const totalPages = state.texts.length * 2 + 4; // intro + metadata + (text+questions)*n + familiarity + thanks
  let progressIndex;
  switch(state.page) {
    case "intro": progressIndex = 1; break;
    case "metadata": progressIndex = 2; break;
    case "text": progressIndex = 3 + state.currentTextIndex * 2; break;
    case "questions": progressIndex = 4 + state.currentTextIndex * 2; break;
    case "familiarity": progressIndex = totalPages - 1; break;
    case "thanks": progressIndex = totalPages; break;
    default: progressIndex = 0;
  }
  const percent = (progressIndex / totalPages) * 100;
  progressBar.style.width = percent + "%";
}

// Render intro page
function renderIntro() {
  updateProgressBar();
  container.innerHTML = `
    <h1>Welcome to the Experiment</h1>
    <p>This study is conducted by Prof. Richard Reichardt at ELTE.</p>
    <p>Contact: <a href="mailto:reichardt.richard@ppk.elte.hu">reichardt.richard@ppk.elte.hu</a></p>
    <p>Please read the consent information carefully before starting.</p>
    <label><input type="checkbox" id="consent-checkbox" /> I have read and agree to participate in this study.</label>
    <button id="start-btn" disabled>Start</button>
  `;
  document.getElementById("consent-checkbox").addEventListener("change", e => {
    document.getElementById("start-btn").disabled = !e.target.checked;
  });
  document.getElementById("start-btn").addEventListener("click", () => {
    state.page = "metadata";
    renderPage();
  });
}

// Render metadata collection page
function renderMetadata() {
  updateProgressBar();
  container.innerHTML = `
    <h2>Participant Information</h2>
    <form id="metadata-form">
      <label>Age:<input type="number" id="age" min="18" max="120" required /></label>
      <label>Education Level:
        <select id="education" required>
          <option value="">Select...</option>
          <option value="High School">High School</option>
          <option value="Undergraduate">Undergraduate</option>
          <option value="Graduate">Graduate</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label>Fluency in English:
        <select id="fluency" required>
          <option value="">Select...</option>
          <option value="Native">Native</option>
          <option value="Fluent">Fluent</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Basic">Basic</option>
        </select>
      </label>
      <button type="submit">Continue</button>
    </form>
  `;
  document.getElementById("metadata-form").addEventListener("submit", e => {
    e.preventDefault();
    state.metadata.age = e.target.age.value;
    state.metadata.education = e.target.education.value;
    state.metadata.fluency = e.target.fluency.value;
    state.page = "text";
    state.currentTextIndex = 0;
    startTimer();
    renderPage();
  });
}

// Render text page (hide questions)
function renderText() {
  updateProgressBar();
  const textObj = state.texts[state.currentTextIndex];
  container.innerHTML = `
    <h2>Text ${state.currentTextIndex + 1} of ${state.texts.length}</h2>
    <h3>${textObj.title}</h3>
    <div class="text-container">${textObj.narrative}</div>
    <button id="next-btn">Next: Questions</button>
    <div id="timer">Time left: ${formatTime(state.timerRemaining)}</div>
  `;
  document.getElementById("next-btn").addEventListener("click", () => {
    state.page = "questions";
    renderPage();
  });
}

// Render questions page (hide text)
function renderQuestions() {
  updateProgressBar();
  const textObj = state.texts[state.currentTextIndex];
  container.innerHTML = `
    <h2>Questions for Text ${state.currentTextIndex + 1}</h2>
    <form id="questions-form">
      ${textObj.questions
        .map((q, i) => `
          <label>${q}
            <textarea name="q${i}" required rows="2"></textarea>
          </label>
        `)
        .join("")}
      <button type="submit">Submit Answers</button>
    </form>
    <div id="timer">Time left: ${formatTime(state.timerRemaining)}</div>
  `;

  document.getElementById("questions-form").addEventListener("submit", e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const answers = {};
    for(let i = 0; i < textObj.questions.length; i++) {
      answers[`q${i}`] = formData.get(`q${i}`).trim();
    }
    state.data.push({
      textIndex: state.currentTextIndex,
      answers,
      timestamp: new Date().toISOString()
    });
    state.currentTextIndex++;
    if(state.currentTextIndex < state.texts.length) {
      state.page = "text";
      state.timerRemaining = TIMER_DURATION_MS;
      startTimer();
    } else {
      state.page = "familiarity";
      stopTimer();
    }
    renderPage();
  });
}

// Render familiarity scale
function renderFamiliarity() {
  updateProgressBar();
  container.innerHTML = `
    <h2>Familiarity with Topics</h2>
    <form id="familiarity-form">
      <label>How familiar are you with the topics you just read?
        <select id="familiarity" required>
          <option value="">Select...</option>
          <option value="Not familiar at all">Not familiar at all</option>
          <option value="Slightly familiar">Slightly familiar</option>
          <option value="Moderately familiar">Moderately familiar</option>
          <option value="Very familiar">Very familiar</option>
          <option value="Extremely familiar">Extremely familiar</option>
        </select>
      </label>
      <button type="submit">Finish</button>
    </form>
  `;
  document.getElementById("familiarity-form").addEventListener("submit", e => {
    e.preventDefault();
    state.metadata.familiarity = e.target.familiarity.value;
    state.page = "thanks";
    renderPage();
  });
}

// Render thank you page and submit data
function renderThanks() {
  updateProgressBar();
  container.innerHTML = `
    <h1>Thank you for participating!</h1>
    <p>Your responses have been recorded.</p>
  `;
  submitData();
}

// Timer functions
function startTimer() {
  if(state.timer) clearInterval(state.timer);
  const startTime = Date.now();
  const endTime = startTime + state.timerRemaining;
  state.timer = setInterval(() => {
    const now = Date.now();
    state.timerRemaining = Math.max(0, endTime - now);
    document.getElementById("timer")?.textContent = `Time left: ${formatTime(state.timerRemaining)}`;
    if(state.timerRemaining <= 0) {
      clearInterval(state.timer);
      if(state.page === "text") {
        // Auto-move to questions if timer ends
        state.page = "questions";
        renderPage();
      } else if(state.page === "questions") {
        alert("Time is up! Please submit your answers.");
      }
    }
  }, 1000);
}

function stopTimer() {
  if(state.timer) clearInterval(state.timer);
  state.timer = null;
}

// Submit data to Google Sheets via Apps Script
function submitData() {
  const payload = {
    participantId: state.participantId,
    metadata: state.metadata,
    responses: state.data
  };
  fetch(FORM_POST_URL, {
    method: "POST",
    headers: {"Content-Type": "text/plain"},
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok) throw new Error("Network response was not ok");
    console.log("Data submitted successfully");
  })
  .catch(err => {
    console.error("Failed to submit data:", err);
  });
}

// Main render dispatcher
function renderPage() {
  switch(state.page) {
    case "intro": renderIntro(); break;
    case "metadata": renderMetadata(); break;
    case "text": renderText(); break;
    case "questions": renderQuestions(); break;
    case "familiarity": renderFamiliarity(); break;
    case "thanks": renderThanks(); break;
  }
}

// Initialization
async function init() {
  await loadTexts();
  renderPage();
}
init();
