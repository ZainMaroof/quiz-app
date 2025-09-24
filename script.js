// ----- Replace with your Firebase keys -----
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_APP.firebaseapp.com",
  databaseURL: "https://YOUR_APP.firebaseio.com",
  projectId: "YOUR_APP",
  storageBucket: "YOUR_APP.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Your 10 Questions
const questions = [
 {q:"Which feature lets a computer instantly locate a word or phrase inside a document?",
  options:["Linear pattern search","Text line editing","Keyword searching","Line-length adjustment"], ans:2},

 {q:"Which method scans each character from left to right to find a match?",
  options:["Keyword searching","Linear pattern search","Critical thinking","Text summarisation"], ans:1},

 {q:"What is the main purpose of line-length adjustment?",
  options:["Delete errors","Improve readability","Add keywords","Make text colorful"], ans:1},

 {q:"Which step allows inserting, deleting, or replacing words to improve clarity?",
  options:["Linear pattern search","Text compression","Text line editing","Keyword searching"], ans:2},

 {q:"Critical thinking mainly helps you to:",
  options:["Summarise and analyse ideas","Adjust fonts","Decorate slides","Memorise text"], ans:0},

 {q:"Which shortcut is commonly used for quick keyword search in most editors?",
  options:["Ctrl + F","Ctrl + Z","Ctrl + S","Ctrl + A"], ans:0},

 {q:"When you adjust text so it wraps neatly without cutting words, it is called:",
  options:["Data mining","Word wrapping","Syntax parsing","Keyword tagging"], ans:1},

 {q:"Which technique would you use to correct a spelling mistake in one specific line?",
  options:["Linear pattern search","Keyword indexing","Text compression","Text line editing"], ans:3},

 {q:"In linear pattern search, if the pattern is not found at position one, what happens next?",
  options:["It shifts one position and checks again","Search stops","It deletes the text","It jumps randomly"], ans:0},

 {q:"Which of these combines several text-processing techniques to quickly find useful information?",
  options:["Graphic design","Text mining","Video encoding","Image editing"], ans:1}
];

let i=0, score=0;

function startGame(){ showQ(); }

function showQ(){
  const q=questions[i];
  document.getElementById('qText').innerText=q.q;
  const opts=document.getElementById('options');
  opts.innerHTML='';
  q.options.forEach((opt,index)=>{
    const b=document.createElement('button');
    b.innerText=opt;
    b.onclick=()=>{ 
      if(index===q.ans) score++; 
      nextQ(); 
    };
    opts.appendChild(b);
  });
}

function nextQ(){
  i++;
  if(i<questions.length){ showQ();}
  else finish();
}

function finish(){
  localStorage.setItem('score',score);
  const name=localStorage.getItem('username');
  db.ref('scores').push({name,score});
  window.location='result.html';
}

function loadBoard(){
  const ul=document.getElementById('board');
  db.ref('scores').orderByChild('score').limitToLast(100)
    .on('value',snap=>{
      const data=[];
      snap.forEach(s=>data.push(s.val()));
      data.sort((a,b)=>b.score-a.score);
      ul.innerHTML='';
      data.forEach(d=>{
        const li=document.createElement('li');
        li.textContent=`${d.name} : ${d.score}`;
        ul.appendChild(li);
      });
    });
}
