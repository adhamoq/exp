const SHEET_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL"; // Replace with your actual endpoint
const TEXTS_JSON = "texts.json";
const TEXT_IDS = ["N1","E1","N2","E2","N3","E3","N4","E4","N5","E5","N6","E6","N7","E7","N8"];
const TEXTS_PER_PARTICIPANT = 4;

let state = {
  step: 0,
  participantId: "",
  age: "",
  fluency: "",
  assignedTexts: [],
  answers: {},
  texts: []
};

function $(sel) { return document.querySelector(sel); }
function render(html) { $("#app").innerHTML = html; }

function uuid() {
  return 'xxxxxxxxyxxx'.replace(/[xy]/g, c => {
    let r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Latin square assignment for 4 texts per participant
function latinSquare(texts, n) {
  // Rotate the array by a random offset
  let offset = Math.floor(Math.random() * texts.length);
  let arr = texts.slice(offset).concat(texts.slice(0, offset));
  // Pick every (texts.length / n)th element
  let step = Math.floor(texts.length / n);
  let result = [];
  for (let i = 0; i < n; i++) {
    result.push(arr[(i * step) % texts.length]);
  }
  return result;
}

function progressBar() {
  const totalSteps = 2 + state.assignedTexts.length; // consent + demographics + texts
  const current = state.step + 1;
  const percent = Math.round(100 * current / totalSteps);
  return `
    <div class="progress-bar-bg" aria-label="Progress">
      <div class="progress-bar-fg" style="width:${percent}%"></div>
    </div>
    <p>Progress: ${current} / ${totalSteps}</p>
  `;
}

function renderConsent() {
  render(`
    ${progressBar()}
    <form id="consent-form" tabindex="0">
      <h2>Consent</h2>
      <p>This experiment is part of a research project by <b>Mohammed Nasser Al Moqdad</b>. Your participation is voluntary and anonymous.</p>
      <label><input type="checkbox" required> I have read and agree to participate.</label>
      <button type="submit">Begin</button>
    </form>
  `);
  $("#consent-form").onsubmit = e => {
    e.preventDefault();
    state.step++;
    renderDemographics();
  };
}

function renderDemographics() {
  render(`
    ${progressBar()}
    <form id="demo-form" tabindex="0">
      <h2>Participant Information</h2>
      <label>
        Age:
        <input type="number" name="age" min="18" max="99" required>
      </label>
      <label>
        English Fluency (1=not fluent, 5=native):
        <select name="fluency" required>
          <option value="">Select</option>
          <option value="1">1 - Not fluent</option>
          <option value="2">2</option>
          <option value="3">3 - Average</option>
          <option value="4">4</option>
          <option value="5">5 - Native</option>
        </select>
      </label>
      <button type="submit">Continue</button>
    </form>
  `);
  $("#demo-form").onsubmit = e => {
    e.preventDefault();
    state.age = e.target.age.value;
    state.fluency = e.target.fluency.value;
    state.step++;
    renderTextPage(0);
  };
}

function renderTextPage(idx) {
  const textObj = state.assignedTexts[idx];
  render(`
    ${progressBar()}
    <form id="text-form" tabindex="0">
      <h2>Text ${idx+1} of ${state.assignedTexts.length}</h2>
      <div style="margin-bottom:1em; padding:1em; background:#fff; border:1px solid #ccc; border-radius:6px;">
        <strong>${textObj.id} (${textObj.type})</strong><br>
        ${textObj.text}
      </div>
      <label>
        Your answer:
        <textarea name="answer" rows="4" required></textarea>
      </label>
      <button type="submit">${idx+1 < state.assignedTexts.length ? "Continue" : "Finish"}</button>
    </form>
  `);
  $("#text-form").onsubmit = e => {
    e.preventDefault();
    state.answers[textObj.id] = e.target.answer.value;
    if (idx + 1 < state.assignedTexts.length) {
      state.step++;
      renderTextPage(idx + 1);
    } else {
      state.step++;
      renderSubmit();
    }
  };
}

function renderSubmit() {
  render(`
    ${progressBar()}
    <div tabindex="0">
      <h2>Thank you!</h2>
      <p>Your responses have been recorded.</p>
    </div>
  `);
  submitData();
}

function submitData() {
  // Prepare row for Google Sheet
  let row = {
    timestamp: new Date().toISOString(),
    participantid: state.participantId,
    age: state.age,
    fluency: state.fluency
  };
  // Fill in answers under correct columns, leave others empty
  TEXT_IDS.forEach(id => {
    row[id] = state.answers[id] || "";
  });

  // Send to Google Apps Script endpoint
  fetch(SHEET_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(row)
  }).catch(err => {
    alert("Submission failed. Please check your connection and try again.");
  });
}

async function start() {
  state.participantId = uuid();
  // Load texts
  let texts = [];
  try {
    let resp = await fetch(TEXTS_JSON);
    texts = await resp.json();
  } catch (e) {
    render(`<p style="color:red;">Failed to load texts. Please check your connection or contact the researcher.</p>`);
    return;
  }
  state.texts = texts;
  // Latin square assignment
  state.assignedTexts = latinSquare(texts, TEXTS_PER_PARTICIPANT);
  state.step = 0;
  renderConsent();
}

document.addEventListener("DOMContentLoaded", start);
