/* ATHLETE PARTNER - linked working demo JavaScript
   Storage: browser LocalStorage. Not production authentication/security. */
"use strict";

const STORAGE_KEY = "athletePartnerDataV1";
const today = () => new Date().toLocaleDateString("en-CA");

const initialData = {
  director:{username:"Hardik",password:"1234"},
  coaches:[{id:1,name:"Rakesh Sir",sport:"Football",username:"Rakesh",password:"1111"}],
  students:[{id:1,name:"Aarav Singh",age:15,sport:"Football",height:165,weight:55,username:"Aarav",password:"2222",coach:"Rakesh"}],
  attendance:[{id:1,studentId:1,date:"2026-11-23",status:"Present"}],
  scores:[{id:1,studentId:1,score:72,note:"Work on stamina",date:"2026-11-01"}],
  exercises:[],
  notices:[{id:1,message:"Practice time is 6:00 AM",author:"Director",date:"2026-11-23"}]
};

let db;
let currentUser = null;
let selectedStudentId = null;

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function nextId(list){ return list.reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1; }
function byId(id){ return document.getElementById(id); }
function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
}
function safeText(value){ return String(value ?? ""); }

function loadData(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    db=raw?JSON.parse(raw):clone(initialData);
    if(!db || !db.director || !Array.isArray(db.coaches) || !Array.isArray(db.students)) throw new Error("Invalid data");
    db.attendance ||= []; db.scores ||= []; db.exercises ||= []; db.notices ||= [];
  }catch(err){
    db=clone(initialData);
    alert("Saved app data was unreadable. Demo data has been loaded.");
  }
  saveData();
}

function showPart(role){
  document.querySelectorAll(".part").forEach(p=>p.hidden=p.dataset.part!==role);
  byId("logoutBtn").hidden=role==="login";
  if(role==="login"){
    byId("whoText").textContent="One College. One Team. One Platform.";
    return;
  }
  const name=currentUser?.name || currentUser?.username || "User";
  byId("whoText").textContent=`Welcome, ${name}`;
  const first=document.querySelector(`.menu[data-menu="${role}"] [data-go]`);
  if(first) go(first.dataset.go);
  renderAll();
}

function go(pageKey){
  const group=pageKey.split("-")[0];
  document.querySelectorAll(`.page[data-page^="${group}-"]`).forEach(p=>p.hidden=p.dataset.page!==pageKey);
  document.querySelectorAll(`.menu[data-menu="${group}"] button`).forEach(b=>b.classList.toggle("active",b.dataset.go===pageKey));
  if(pageKey==="coach-attendance") renderAttendanceMarkList();
  if(pageKey==="director-attendance") renderDirectorAttendance();
  if(pageKey==="coach-detail") renderStudentDetail();
}

function login(){
  const role=byId("lRole").value;
  const username=byId("lUser").value.trim();
  const password=byId("lPass").value;
  let account=null;
  if(role==="director" && db.director.username===username && db.director.password===password){
    account={role,username};
  }else if(role==="coach"){
    const c=db.coaches.find(x=>x.username===username && x.password===password);
    if(c) account={...c,role};
  }else if(role==="student"){
    const s=db.students.find(x=>x.username===username && x.password===password);
    if(s) account={...s,role};
  }
  if(!account){alert("Username or password is incorrect.");return;}
  currentUser=account;
  byId("lPass").value="";
  showPart(role);
}
function logout(){currentUser=null;selectedStudentId=null;showPart("login");}

function myStudents(){
  if(!currentUser) return [];
  return db.students.filter(s=>currentUser.role==="director" || s.coach===currentUser.username);
}
function getStudent(id){return db.students.find(s=>s.id===Number(id));}
function studentScores(id){return db.scores.filter(x=>x.studentId===Number(id)).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);}
function attendancePercent(id){
  const records=db.attendance.filter(a=>a.studentId===Number(id));
  return records.length?Math.round(records.filter(a=>a.status==="Present").length/records.length*100):0;
}
function rowHTML(left,right=""){
  return `<div class="line"><span class="line-main">${left}</span><span class="line-actions">${right}</span></div>`;
}
function emptyHTML(message="No records available."){return `<p class="empty">${escapeHTML(message)}</p>`;}

function registerStudent(){
  const name=byId("rName").value.trim(), age=Number(byId("rAge").value);
  const sport=byId("rSport").value, height=Number(byId("rHeight").value);
  const weight=Number(byId("rWeight").value), username=byId("rUser").value.trim();
  const password=byId("rPass").value;
  if(!name||!username||!password||!age||!height||!weight){alert("Please fill every field.");return;}
  if(age<5||age>100||height<=0||weight<=0){alert("Please enter valid age, height and weight.");return;}
  if([...db.students,...db.coaches].some(x=>x.username.toLowerCase()===username.toLowerCase())||db.director.username===username){alert("This username is already in use.");return;}
  db.students.push({id:nextId(db.students),name,age,sport,height,weight,username,password,coach:currentUser.username});
  saveData(); byId("rName").value=byId("rAge").value=byId("rHeight").value=byId("rWeight").value=byId("rUser").value=byId("rPass").value="";
  alert("Student registered. Login username: "+username);
  renderAll();
}

function addCoach(){
  const name=byId("cName").value.trim(),sport=byId("cSport").value,username=byId("cUser").value.trim(),password=byId("cPass").value;
  if(!name||!username||!password){alert("Please fill all coach details.");return;}
  if([...db.students,...db.coaches].some(x=>x.username.toLowerCase()===username.toLowerCase())||db.director.username===username){alert("Username already exists.");return;}
  db.coaches.push({id:nextId(db.coaches),name,sport,username,password});
  saveData(); ["cName","cUser","cPass"].forEach(id=>byId(id).value="");
  alert("Coach added successfully.");renderAll();
}

function renderAttendanceMarkList(){
  const host=byId("attendanceMarkList"); if(!host)return;
  const date=byId("attendanceDate").value||today();
  host.innerHTML=myStudents().map(s=>{
    const rec=db.attendance.find(a=>a.studentId===s.id&&a.date===date);
    return `<div class="line"><span class="line-main">${escapeHTML(s.name)} <span class="tag">${escapeHTML(s.sport)}</span></span>
      <span class="line-actions">
        <button data-attendance="${s.id}|Present" class="${rec?.status==="Present"?"on":""}">Present</button>
        <button data-attendance="${s.id}|Absent" class="${rec?.status==="Absent"?"on":""}">Absent</button>
      </span></div>`;
  }).join("")||emptyHTML("Register a student before marking attendance.");
}
function setAttendance(studentId,status){
  const date=byId("attendanceDate").value||today();
  let rec=db.attendance.find(a=>a.studentId===Number(studentId)&&a.date===date);
  if(rec)rec.status=status;else db.attendance.push({id:nextId(db.attendance),studentId:Number(studentId),date,status});
  saveData();renderAttendanceMarkList();renderAll();
}
function renderDirectorAttendance(){
  const host=byId("directorAttendanceReport");if(!host)return;
  const date=byId("reportDate").value||today();
  const records=db.students.map(s=>({s,a:db.attendance.find(x=>x.studentId===s.id&&x.date===date)}));
  const present=records.filter(x=>x.a?.status==="Present").length;
  const absent=records.filter(x=>x.a?.status==="Absent").length;
  host.innerHTML=`<p><b class="green">${present} present</b> · <b class="bad">${absent} absent</b> · ${records.length-present-absent} not marked</p>`+
    (records.map(({s,a})=>rowHTML(`${escapeHTML(s.name)} <span class="tag">${escapeHTML(s.sport)}</span>`,a?`<b class="${a.status==="Present"?"green":"bad"}">${a.status}</b>`:"Not marked")).join("")||emptyHTML());
}

function addScore(){
  const studentId=Number(byId("sStudent").value),score=Number(byId("sScore").value),date=byId("sDate").value,note=byId("sNote").value.trim();
  const student=getStudent(studentId);
  if(!student||!Number.isInteger(score)||score<0||score>100||!date){alert("Select a student and enter a valid score from 0 to 100 and date.");return;}
  if(currentUser.role==="coach"&&student.coach!==currentUser.username){alert("You can only add scores for your students.");return;}
  db.scores.push({id:nextId(db.scores),studentId,score,date,note});
  saveData();byId("sScore").value="";byId("sNote").value="";alert("Score saved.");renderAll();
}

function assignExercise(){
  const title=byId("eTitle").value.trim(),link=byId("eLink").value.trim(),student=getStudent(selectedStudentId);
  if(!student||!title){alert("Enter an exercise name.");return;}
  if(link){try{const u=new URL(link);if(!["http:","https:"].includes(u.protocol))throw 0;}catch{alert("Please enter a valid http/https link.");return;}}
  db.exercises.push({id:nextId(db.exercises),studentId:student.id,title,link,date:today(),coach:currentUser.username});
  saveData();byId("eTitle").value="";byId("eLink").value="";alert("Exercise assigned.");renderAll();renderStudentDetail();
}

function postNotice(role){
  const input=byId(role==="coach"?"coachNoticeText":"directorNoticeText");
  const message=input.value.trim();if(!message){alert("Write a notice first.");return;}
  db.notices.unshift({id:nextId(db.notices),message,author:currentUser.name||currentUser.username,date:today()});
  saveData();input.value="";alert("Notice posted.");renderAll();
}

function removeStudent(id){
  const s=getStudent(id);if(!s)return;
  if(!confirm(`Remove ${s.name} and all related attendance, scores and exercises?`))return;
  db.students=db.students.filter(x=>x.id!==s.id);
  db.attendance=db.attendance.filter(x=>x.studentId!==s.id);
  db.scores=db.scores.filter(x=>x.studentId!==s.id);
  db.exercises=db.exercises.filter(x=>x.studentId!==s.id);
  saveData();selectedStudentId=null;go("coach-students");renderAll();
}
function removeCoach(id){
  const c=db.coaches.find(x=>x.id===Number(id));if(!c)return;
  const owned=db.students.filter(s=>s.coach===c.username);
  if(!confirm(`Remove ${c.name} and ${owned.length} student(s) assigned to this coach?`))return;
  const ids=owned.map(s=>s.id);
  db.students=db.students.filter(s=>s.coach!==c.username);
  db.attendance=db.attendance.filter(a=>!ids.includes(a.studentId));
  db.scores=db.scores.filter(a=>!ids.includes(a.studentId));
  db.exercises=db.exercises.filter(a=>!ids.includes(a.studentId));
  db.coaches=db.coaches.filter(x=>x.id!==c.id);
  saveData();renderAll();
}

function changePassword(){
  const id=currentUser.role==="student"?"studentNewPassword":currentUser.role==="coach"?"coachNewPassword":"directorNewPassword";
  const input=byId(id),password=input.value;
  if(password.length<4){alert("Password must be at least 4 characters.");return;}
  if(currentUser.role==="director")db.director.password=password;
  else if(currentUser.role==="coach"){const c=db.coaches.find(x=>x.id===currentUser.id);if(c)c.password=password;}
  else{const s=db.students.find(x=>x.id===currentUser.id);if(s)s.password=password;}
  saveData();alert("Password updated. Please login again.");logout();
}

function downloadBackup(){
  const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="athlete-partner-backup.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function restoreBackup(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!data.director||!["coaches","students","attendance","scores","exercises","notices"].every(k=>Array.isArray(data[k])))throw new Error("Invalid file");
      if(!confirm("This will replace current project data. Continue?"))return;
      db=data;saveData();alert("Backup restored.");renderAll();
    }catch(e){alert("This is not a valid ATHLETE PARTNER backup file.");}
  };
  reader.readAsText(file);
}

function renderStudent(){
  const s=getStudent(currentUser.id);if(!s){logout();return;}
  const scores=studentScores(s.id),latest=scores[0];
  byId("studentLatestScore").textContent=latest?latest.score:"—";
  byId("studentAttendance").textContent=attendancePercent(s.id)+"%";
  byId("studentScoreCount").textContent=scores.length;
  byId("studentAttendanceDetail").textContent=attendancePercent(s.id)+"%";
  byId("studentProfile").innerHTML=[
    rowHTML("Name",`<b>${escapeHTML(s.name)}</b>`),
    rowHTML("Age",`<b>${s.age}</b>`),
    rowHTML("Sport",`<b>${escapeHTML(s.sport)}</b>`),
    rowHTML("Coach",`<b>${escapeHTML(db.coaches.find(c=>c.username===s.coach)?.name||s.coach)}</b>`),
    rowHTML("Height / Weight",`<b>${s.height} cm / ${s.weight} kg</b>`)
  ].join("");
  byId("studentScoreHistory").innerHTML=scores.map(x=>rowHTML(`<b>${x.score}/100</b> — ${escapeHTML(x.note||"No note")}`,`<small>${escapeHTML(x.date)}</small>`)).join("")||emptyHTML("No scores have been added yet.");
  const attendance=db.attendance.filter(a=>a.studentId===s.id).sort((a,b)=>b.date.localeCompare(a.date));
  byId("studentAttendanceList").innerHTML=attendance.map(a=>rowHTML(escapeHTML(a.date),`<b class="${a.status==="Present"?"green":"bad"}">${a.status}</b>`)).join("")||emptyHTML("No attendance records yet.");
  const exercises=db.exercises.filter(x=>x.studentId===s.id).sort((a,b)=>b.id-a.id);
  byId("studentExerciseList").innerHTML=exercises.map(x=>rowHTML(escapeHTML(x.title),x.link?`<a href="${escapeHTML(x.link)}" target="_blank" rel="noopener noreferrer">Open link</a>`:`<small>${escapeHTML(x.date)}</small>`)).join("")||emptyHTML("No exercises assigned yet.");
  byId("studentNotices").innerHTML=renderNoticeRows();
}
function renderNoticeRows(){return db.notices.map(n=>rowHTML(escapeHTML(n.message),`<small>${escapeHTML(n.author)} · ${escapeHTML(n.date)}</small>`)).join("")||emptyHTML("No notices posted.");}

function renderStudentDetail(){
  const s=getStudent(selectedStudentId);if(!s)return;
  byId("detailStudentName").textContent=s.name;
  byId("detailStudentInfo").innerHTML=[
    rowHTML("Sport",escapeHTML(s.sport)),rowHTML("Age",String(s.age)),
    rowHTML("Attendance",attendancePercent(s.id)+"%"),
    rowHTML("Latest score",studentScores(s.id)[0]?.score??"No score")
  ].join("");
}
function renderAll(){
  if(!currentUser)return;
  const students=myStudents();
  if(currentUser.role==="student"){renderStudent();return;}
  if(currentUser.role==="coach"){
    byId("coachStudentCount").textContent=students.length;
    byId("coachSport").textContent=currentUser.sport;
    const list=students.map(s=>rowHTML(`${escapeHTML(s.name)} <span class="tag">${escapeHTML(s.sport)}</span>`,`<button data-view-student="${s.id}">View</button>`)).join("")||emptyHTML("No students registered yet.");
    byId("coachOverviewList").innerHTML=list;
    byId("coachStudentList").innerHTML=students.map(s=>rowHTML(`${escapeHTML(s.name)} · age ${s.age} · ${escapeHTML(s.sport)}`,`<button data-view-student="${s.id}">View</button>`)).join("")||emptyHTML();
    byId("coachNoticeList").innerHTML=renderNoticeRows();
    byId("sStudent").innerHTML=students.map(s=>`<option value="${s.id}">${escapeHTML(s.name)}</option>`).join("");
    renderAttendanceMarkList();
    if(selectedStudentId)renderStudentDetail();
  }
  if(currentUser.role==="director"){
    byId("directorStudentCount").textContent=db.students.length;
    byId("directorCoachCount").textContent=db.coaches.length;
    byId("directorPresentCount").textContent=db.attendance.filter(a=>a.date===today()&&a.status==="Present").length;
    const counts={};db.students.forEach(s=>counts[s.sport]=(counts[s.sport]||0)+1);
    byId("sportSummary").innerHTML=Object.entries(counts).map(([sport,count])=>rowHTML(escapeHTML(sport),String(count))).join("")||emptyHTML();
    const top=db.students.map(s=>({s,score:studentScores(s.id)[0]?.score??-1})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
    byId("topPerformers").innerHTML=top.map(x=>rowHTML(escapeHTML(x.s.name),`<b>${x.score}/100</b>`)).join("")||emptyHTML();
    byId("directorCoachList").innerHTML=db.coaches.map(c=>rowHTML(`${escapeHTML(c.name)} <span class="tag">${escapeHTML(c.sport)}</span><br><small>${escapeHTML(c.username)} · ${db.students.filter(s=>s.coach===c.username).length} students</small>`,`<button class="red" data-remove-coach="${c.id}">Remove</button>`)).join("")||emptyHTML();
    byId("directorStudentList").innerHTML=db.students.map(s=>rowHTML(`${escapeHTML(s.name)} <span class="tag">${escapeHTML(s.sport)}</span><br><small>${escapeHTML(s.username)} · Coach: ${escapeHTML(s.coach)}</small>`,`<b>${attendancePercent(s.id)}%</b>`)).join("")||emptyHTML();
    byId("directorNoticeList").innerHTML=renderNoticeRows();
    renderDirectorAttendance();
  }
}

document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.id==="loginBtn"){login();return;}
  if(b.id==="logoutBtn"){logout();return;}
  if(b.dataset.go){go(b.dataset.go);return;}
  if(b.id==="registerStudentBtn"){registerStudent();return;}
  if(b.id==="addCoachBtn"){addCoach();return;}
  if(b.id==="saveScoreBtn"){addScore();return;}
  if(b.id==="assignExerciseBtn"){assignExercise();return;}
  if(b.id==="coachPostNoticeBtn"){postNotice("coach");return;}
  if(b.id==="directorPostNoticeBtn"){postNotice("director");return;}
  if(b.id==="removeStudentBtn"){removeStudent(selectedStudentId);return;}
  if(b.id==="downloadBackupBtn"){downloadBackup();return;}
  if(b.classList.contains("save-password")){changePassword();return;}
  if(b.dataset.attendance){const [id,status]=b.dataset.attendance.split("|");setAttendance(id,status);return;}
  if(b.dataset.viewStudent){selectedStudentId=Number(b.dataset.viewStudent);go("coach-detail");return;}
  if(b.dataset.removeCoach){removeCoach(b.dataset.removeCoach);return;}
});
document.addEventListener("change",e=>{
  if(e.target.id==="attendanceDate")renderAttendanceMarkList();
  if(e.target.id==="reportDate")renderDirectorAttendance();
  if(e.target.id==="restoreFile"){restoreBackup(e.target.files[0]);e.target.value="";}
});
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&(e.target.id==="lUser"||e.target.id==="lPass"))login();
});

loadData();
byId("attendanceDate").value=today();
byId("sDate").value=today();
byId("reportDate").value=today();
showPart("login");
