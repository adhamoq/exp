/* ============================
  Experiment configuration
============================*/
const JSON_URL = "https://api.jsonsilo.com/public/26c41b8c-31a3-4bc0-a421-f9ecf9678003";
const FORM_POST_URL = "https://script.google.com/macros/s/AKfycbxuEEHDR_5mggc3XKlwTSxw2tK664M_Rxry_gAYg9Llyc-AF46eCVpNzk1cz0jI8hKx/exec";
const TIMER_DURATION_MS = 5 * 60 * 1000; // 5 min
const TEXTS_PER_PARTICIPANT = 4;

/*  Ordered list matching spreadsheet columns
    Narrative N1‥N8, Exploratory E1‥E7  */
const TEXT_ID_ORDER = [
  "N1","E1","N2","E2","N3","E3","N4","E4","N5","E5","N6","E6","N7","E7","N8"
];

/* ============================
  Latin-square utilities
============================*/
function balancedLatinSquare(n){
  // Algorithm from Bradley (1958) – returns n arrays length n
  const base = [];
  for(let i=0;i<n;i++){
    base.push(i%2===0 ? i/2 : n-1-(i-1)/2);
  }
  const square = [];
  for(let r=0;r<n;r++){
    square[r] = base.map(v => (v+r)%n);
  }
  return square;
}

/* Generate sequence for this participant & slice first 4 ids */
function getParticipantSequence(){
  const n = TEXT_ID_ORDER.length;
  const square = balancedLatinSquare(n);
  const row = Math.floor(Math.random()*n);
  const full = square[row].map(idx=>TEXT_ID_ORDER[idx]);
  return full.slice(0,TEXTS_PER_PARTICIPANT);
}

/* ============================
  Global experiment state
============================*/
const state = {
  page:"intro",
  participantId: genId(),
  metadata:{},
  selectedIds: getParticipantSequence(), // 4 IDs
  texts:[], // full objects of the 4 selected texts
  curIndex:0,
  data:{}, // answers keyed by textID
  timer:null,
  remaining:TIMER_DURATION_MS
};

const container = document.getElementById("container");
const progressBar = document.getElementById("progress-bar");

function genId(){return "P-"+crypto.randomUUID().slice(0,8).toUpperCase();}
function fmt(ms){const s=Math.floor(ms/1000);const m=Math.floor(s/60);return `${m}:${String(s%60).padStart(2,"0")}`;}

/* ============================
  Load + filter texts
============================*/
async function loadTexts(){
  const res=await fetch(JSON_URL); if(!res.ok) throw new Error("JSON fetch failed");
  const all = await res.json();
  // keep only texts in participant sequence and preserve same order
  state.texts = state.selectedIds.map(id=> all.find(t=>t.id===id));
}

/* ============================
  Progress-bar helper
============================*/
function setProgress(){
  const total = state.texts.length*2 + 4; // intro + metadata + (text+qs)*n + familiar + thanks
  let step=0;
  switch(state.page){
    case "intro": step=1; break;
    case "metadata": step=2; break;
    case "text": step=3+state.curIndex*2; break;
    case "questions": step=4+state.curIndex*2; break;
    case "familiarity": step=total-1; break;
    case "thanks": step=total; break;
  }
  progressBar.style.width = (step/total*100).toFixed(2)+"%";
}

/* ============================
  Page renderers (intro, etc.)
============================*/
function renderIntro(){
  setProgress();
  container.innerHTML=`
    <h2>Welcome to the Experiment</h2>
    <p>This study is conducted to explore comprehension of narrative and explanatory texts.</p>
    <p>Please read the consent information carefully before starting.</p>
    <label><input id="consChk" type="checkbox">  I have read the information and agree to participate.</label>
    <button id="startBtn" disabled>Begin</button>
  `;
  const chk=document.getElementById("consChk");
  chk.addEventListener("change",()=>startBtn.disabled=!chk.checked);
  const startBtn=document.getElementById("startBtn");
  startBtn.addEventListener("click",()=>{state.page="metadata";render();});
}

function renderMetadata(){
  setProgress();
  container.innerHTML=`
    <form id="metaForm" novalidate>
      <h2>Participant Information</h2>
      <label>Age<input name="age" type="number" min="12" required></label>
      <label>Highest education
        <select name="edu" required>
          <option value="" disabled selected>Select…</option>
          <option>High School</option><option>Undergraduate</option><option>Graduate</option><option>Other</option>
        </select>
      </label>
      <label>English fluency
        <select name="flu" required>
          <option value="" disabled selected>Select…</option>
          <option>Native</option><option>Fluent</option><option>Intermediate</option><option>Basic</option>
        </select>
      </label>
      <button>Continue</button>
    </form>`;
  document.getElementById("metaForm").addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    state.metadata = {age:fd.get("age"), fluency:fd.get("flu"), education:fd.get("edu")};
    state.page="text"; state.curIndex=0; startTimer(); render();
  });
}

function renderText(){
  setProgress();
  const txt=state.texts[state.curIndex];
  container.innerHTML=`
    <h2>Text ${state.curIndex+1} of ${state.texts.length}</h2>
    <h3>${txt.title}</h3>
    <p>${txt.content}</p>
    <p id="timer">Time left: ${fmt(state.remaining)}</p>
    <button id="nextBtn">Answer Questions</button>
  `;
  document.getElementById("nextBtn").addEventListener("click",()=>{state.page="questions";render();});
}

function renderQuestions(){
  setProgress();
  const txt=state.texts[state.curIndex];
  container.innerHTML=`
    <form id="qForm" aria-labelledby="qHeading">
      <h2 id="qHeading">Questions for "${txt.title}"</h2>
      ${txt.questions.map((q,i)=>`<label>${q}<textarea name="q${i}" required></textarea></label>`).join("")}
      <p id="timer">Time left: ${fmt(state.remaining)}</p>
      <button>Submit Answers</button>
    </form>`;
  document.getElementById("qForm").addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    state.data[txt.id]= txt.questions.map((_,i)=>fd.get(`q${i}`));
    state.curIndex++;
    if(state.curIndex<state.texts.length){state.page="text"; state.remaining=TIMER_DURATION_MS; startTimer();}
    else {stopTimer(); state.page="familiarity";}
    render();
  });
}

function renderFamiliarity(){
  setProgress();
  container.innerHTML=`
    <form id="famForm">
      <h2>Overall familiarity with the topics</h2>
      <label class="visually-hidden" for="famSel">Select familiarity</label>
      <select id="famSel" name="fam" required>
        <option value="" disabled selected>Select…</option>
        <option>Not familiar at all</option><option>Slightly familiar</option><option>Moderately familiar</option><option>Very familiar</option><option>Extremely familiar</option>
      </select>
      <button>Finish</button>
    </form>`;
  document.getElementById("famForm").addEventListener("submit",e=>{
    e.preventDefault();
    state.metadata.familiarity=e.target.fam.value;
    state.page="thanks";
    render();
  });
}

function renderThanks(){
  setProgress();
  container.innerHTML=`<h2>Thank you for participating!</h2><p>Your responses have been recorded.</p>`;
  submitData();
}

/* ============================
  Timer helpers
============================*/
function startTimer(){
  const end=Date.now()+state.remaining;
  if(state.timer) clearInterval(state.timer);
  state.timer=setInterval(()=>{
    state.remaining=Math.max(0,end-Date.now());
    document.getElementById("timer")?.textContent="Time left: "+fmt(state.remaining);
    if(state.remaining===0){
      clearInterval(state.timer);
      if(state.page==="text"){state.page="questions";render();}
    }
  },1000);
}
function stopTimer(){clearInterval(state.timer);state.timer=null;}

/* ============================
  Data submission (sheet cols)
============================*/
function buildSheetRow(){
  const row={
    timestamp: new Date().toISOString(),
    participantid: state.participantId,
    age: state.metadata.age||"",
    fluency: state.metadata.fluency||""
  };
  // pre-fill all columns with "" then copy answers
  TEXT_ID_ORDER.forEach(id=> row[id]="");
  Object.entries(state.data).forEach(([id,ans])=>{row[id]=ans.join(" | ");});
  return row;
}

function submitData(){
  fetch(FORM_POST_URL,{
    method:"POST", headers:{"Content-Type":"text/plain"},
    body: JSON.stringify(buildSheetRow())
  }).then(r=>console.log("Submitted",r.ok)).catch(err=>console.error(err));
}

/* ============================
  Main render router
============================*/
function render(){
  switch(state.page){
    case "intro": renderIntro(); break;
    case "metadata": renderMetadata(); break;
    case "text": renderText(); break;
    case "questions": renderQuestions(); break;
    case "familiarity": renderFamiliarity(); break;
    case "thanks": renderThanks(); break;
  }
}

/* ============================
  Init
============================*/
(async()=>{
  try{await loadTexts();}catch(e){container.textContent=e.message;return;}
  render();
})();