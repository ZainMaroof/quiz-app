// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCuxsMveMA3c7zt2HKqjWNX-L94ky0Ax3o",
  authDomain: "quiz-app-f810f.firebaseapp.com",
  databaseURL: "https://quiz-app-f810f-default-rtdb.firebaseio.com",
  projectId: "quiz-app-f810f",
  storageBucket: "quiz-app-f810f.firebasestorage.app",
  messagingSenderId: "961378561341",
  appId: "1:961378561341:web:b68edf6a8ab8a8c5046954",
  measurementId: "G-R2TV5877H4"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Constants
// FIXED: The question time is now set to a fixed 15 seconds.
let QUESTION_TIME = 15;
const QUIZ_STATUS_REF = 'quizStatus';
const SCORES_REF = 'scores';

// Questions
const questions = [
{q:"Which feature lets a computer instantly locate a word or phrase inside a document?", options:["Linear pattern search","Text line editing","Keyword searching","Line-length adjustment"], ans:2},
{q:"Which method scans each character from left to right to find a match?", options:["Keyword searching","Linear pattern search","Critical thinking","Text summarisation"], ans:1},
{q:"What is the main purpose of line-length adjustment?", options:["Delete errors","Improve readability","Add keywords","Make text colorful"], ans:1},
{q:"Which step allows inserting, deleting, or replacing words to improve clarity?", options:["Linear pattern search","Text compression","Text line editing","Keyword searching"], ans:2},
{q:"Critical thinking mainly helps you to:", options:["Summarise and analyse ideas","Adjust fonts","Decorate slides","Memorise text"], ans:0},
{q:"Which shortcut is commonly used for quick keyword search in most editors?", options:["Ctrl + F","Ctrl + Z","Ctrl + S","Ctrl + A"], ans:0},
{q:"When you adjust text so it wraps neatly without cutting words, it is called:", options:["Data mining","Word wrapping","Syntax parsing","Keyword tagging"], ans:1},
{q:"Which technique would you use to correct a spelling mistake in one specific line?", options:["Linear pattern search","Keyword indexing","Text compression","Text line editing"], ans:3},
{q:"In linear pattern search, if the pattern is not found at position one, what happens next?", options:["It shifts one position and checks again", "Search stops", "It deletes the text", "It jumps randomly"], ans:0},
{q:"Which of these combines several text-processing techniques to quickly find useful information?", options:["Graphic design","Text mining", "Video encoding", "Image editing"], ans:1}
];

// Sound Effects
const correctSound = new Audio('https://s3-us-west-2.amazonaws.com/s.cdpn.io/325771/correct.mp3');
const incorrectSound = new Audio('https://s3-us-west-2.amazonaws.com/s.cdpn.io/325771/incorrect.mp3');
const timeUpSound = new Audio('https://s3-us-west-2.amazonaws.com/s.cdpn.io/325771/buzzer.mp3');

// Local state
let currentQIndex = -1;
let timerInterval;
let hasAnswered = false;
const username = localStorage.getItem('username');
let scoreEntryKey = localStorage.getItem('scoreEntryKey');

// --- Helper Function ---

function initializeScoreEntry(name, callback) {
    // FIX: Always create a new score entry for a new game to prevent overwriting 
    // a user's previous high score and to ensure all game attempts are logged 
    // on the leaderboard, addressing the score refreshing/consistency issue.
    const newScoreRef = db.ref(SCORES_REF).push({ name: name, score: 0 });
    const key = newScoreRef.key;
    
    localStorage.setItem('scoreEntryKey', key);
    scoreEntryKey = key;
    
    if (callback) callback();
}


// --- Quiz Control Functions ---

function startQuiz(){
    const name = document.getElementById('username').value.trim();
    if(!name){
        alert('Please enter your name');
        return;
    }
    localStorage.setItem('username', name);

    initializeScoreEntry(name, () => {
        // Use SET to guarantee a clean reset of the quiz state to question 0
        db.ref(QUIZ_STATUS_REF).set({
            started: true,
            currentQ: 0,
            startTime: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
             // Redirect only after the state is cleanly set to question 0
             window.location = 'quiz.html';
        }).catch(error => {
            console.error("Error setting initial quiz state:", error);
            alert("Error starting quiz. Check console.");
        });
    });
}


function startGame(){
  if (!username) {
    window.location = 'index.html';
    return;
  }
  
  scoreEntryKey = localStorage.getItem('scoreEntryKey');
  if (!scoreEntryKey) {
      window.location = 'index.html';
      return;
  }
  
  // FIXED: Removed the previous section that would check Firebase 
  // for a timer setting and potentially overwrite QUESTION_TIME.
  
  // Set up listener for global quiz status
  db.ref(QUIZ_STATUS_REF).on('value', (snapshot) => {
      const state = snapshot.val();
      
      // Check if quiz is waiting (state is null or not started)
      if (!state || state.started !== true) { 
        // Show waiting screen content
        document.getElementById('qText').innerText = "Waiting for the quiz to start...";
        document.getElementById('options').innerHTML = '';
        document.getElementById('timer').innerText = '--';
        document.getElementById('progressText').innerText = 'Ready to Start';
        document.getElementById('progressBar').style.width = '0%';
        return;
      }
      
      // Check if the game has finished 
      if (state.currentQ >= questions.length) {
          finish();
          return;
      }
      
      // Quiz has started. Proceed to show the question.
      if (state.currentQ !== currentQIndex) {
        currentQIndex = state.currentQ;
        hasAnswered = false; // Reset answer status for the new question
        showQ(currentQIndex, state.startTime); 
      }
  });
}

// --- Question & Timer Logic ---

function showQ(qIndex, startTime){
  // Check for finish condition
  if(qIndex >= questions.length){
    clearInterval(timerInterval);
    finish();
    return;
  }

  const q = questions[qIndex];
  const totalQ = questions.length;
  
  // Update Progress Bar
  const progressPercent = ((qIndex + 1) / totalQ) * 100;
  document.getElementById('progressBar').style.width = progressPercent + '%';
  document.getElementById('progressText').innerText = `Question ${qIndex + 1}/${totalQ}`;

  // Display Question
  document.getElementById('qText').innerText = q.q;
  const opts = document.getElementById('options');
  opts.innerHTML = '';

  // Start Timer
  clearInterval(timerInterval);
  startTimer(startTime);

  q.options.forEach((opt,index)=>{
    const b = document.createElement('button');
    b.innerText = opt;
    b.onclick = ()=>{
      if(hasAnswered) return; 
      hasAnswered = true;
      clearInterval(timerInterval);
      
      Array.from(opts.children).forEach(btn=>btn.disabled=true);

      if(index===q.ans){
        b.classList.add('correct');
        correctSound.play();
        updateScore(1); 
      } else {
        b.classList.add('incorrect');
        opts.children[q.ans].classList.add('correct');
        incorrectSound.play();
        updateScore(0); 
      }
      
      setTimeout(nextQ, 2000); 
    };
    opts.appendChild(b);
  });
}

function startTimer(qStartTime) {
  const timerDisplay = document.getElementById('timer');
  // Uses the local, fixed QUESTION_TIME (15s)
  const endTime = qStartTime + (QUESTION_TIME * 1000); 
  
  timerInterval = setInterval(() => {
    const now = new Date().getTime();
    const timeLeft = endTime - now;
    
    if (timeLeft < 0) {
      clearInterval(timerInterval);
      timerDisplay.innerText = 'Time Up!';
      timeUpSound.play();
      
      if(!hasAnswered){
          hasAnswered = true;
          updateScore(0); 
          Array.from(document.getElementById('options').children).forEach(btn=>btn.disabled=true);
          document.getElementById('options').children[questions[currentQIndex].ans].classList.add('correct');
          setTimeout(nextQ, 2000); 
      }
      return;
    }
    
    const seconds = Math.floor(timeLeft / 1000);
    timerDisplay.innerText = `${seconds}s`;
    
  }, 100);
}

function updateScore(points) {
    if (!scoreEntryKey) return; 

    db.ref(`${SCORES_REF}/${scoreEntryKey}/score`).transaction((currentScore) => {
        if (currentScore === null) {
            return points;
        }
        return currentScore + points;
    });
}

function nextQ(){
  if(currentQIndex < questions.length){
      db.ref(QUIZ_STATUS_REF).transaction((quizStatus) => {
        if (quizStatus && quizStatus.started === true && quizStatus.currentQ === currentQIndex) {
          return {
            started: true,
            currentQ: currentQIndex + 1,
            startTime: firebase.database.ServerValue.TIMESTAMP
          };
        }
        return undefined; 
      });
  }
}

// --- Finish & Leaderboard ---

function finish(){
  if (!scoreEntryKey) {
      window.location='result.html';
      return;
  }

  db.ref(`${SCORES_REF}/${scoreEntryKey}/score`).once('value', (snapshot) => {
      localStorage.setItem('score', snapshot.val() || 0);
      
      localStorage.removeItem('scoreEntryKey');
      localStorage.removeItem('username');

      window.location='result.html';
  });
}

function loadBoard(){
  const ulTop3 = document.getElementById('board-top-3'); 
  const ulTop10 = document.getElementById('board-top-10'); 

  if (!ulTop3 || !ulTop10) return; 

  db.ref(SCORES_REF)
    .orderByChild('score')
    .on('value', snapshot => {
      const data = [];
      snapshot.forEach(s => {
          const val = s.val();
          if (val && val.score !== undefined) {
              data.push(val);
          }
      });

      // DESCENDING ORDER SORTING (Highest score first)
      data.sort((a,b) => {
        if (a.score !== b.score) {
            return b.score - a.score; 
        }
        return a.name.localeCompare(b.name); 
      });

      ulTop3.innerHTML = '';
      ulTop10.innerHTML = '';

      // Populate Top 3
      data.slice(0, 3).forEach((d, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${d.name} : ${d.score} points`;
        li.classList.add(`rank-${index + 1}`); 
        ulTop3.appendChild(li);
      });

      // Populate Top 10 
      data.slice(0, 10).forEach((d, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${d.name} : ${d.score} points`;
        ulTop10.appendChild(li); 
      });
    });
}