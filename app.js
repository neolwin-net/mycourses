import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* LOGIN */
const loginScreen = document.getElementById("loginScreen");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const error = document.getElementById("error");

const ADMIN_PASSWORD = "root";

loginBtn.onclick = () => {
  if (password.value === ADMIN_PASSWORD) {
    loginScreen.style.display = "none";
  } else {
    error.textContent = "Wrong password";
  }
};

/* UI */
const courseName = document.getElementById("courseName");
const courseStatus = document.getElementById("courseStatus");
const coursesEl = document.getElementById("courses");

const totalEl = document.getElementById("total");
const learnedEl = document.getElementById("learnedCount");
const learningEl = document.getElementById("learningCount");
const notEl = document.getElementById("notCount");

const addBtn = document.getElementById("addCourseBtn");

let currentTab = "all";
let currentData = [];

const coursesRef = collection(db, "courses");

/* PROGRESS CALC */
function progress(course) {
  if (course.status === "not-learned") return 0;
  if (course.status === "learned") return 100;

  const topics = course.topics || [];
  if (topics.length === 0) return 0;

  const done = topics.filter(t => t.done).length;
  return Math.round((done / topics.length) * 100);
}

/* STATUS TEXT */
function statusText(course, percent) {
  if (course.status === "learned") return "Completed ✔";
  if (course.status === "not-learned") return "Not started";
  return `${percent}% completed`;
}

/* COLOR */
function color(percent) {
  if (percent === 100) return "#22c55e";
  if (percent >= 50) return "#facc15";
  return "#ef4444";
}

/* RENDER */
function render(data) {
  coursesEl.innerHTML = "";

  data.forEach(c => {
    if (currentTab !== "all" && c.status !== currentTab) return;

    const percent = progress(c);

    const div = document.createElement("div");
    div.className = "course";

    div.innerHTML = `
      <div class="course-header">
        <strong>${c.name}</strong>

        <div>
          <select data-id="${c.id}" class="status">
            <option value="not-learned" ${c.status==="not-learned"?"selected":""}>Need</option>
            <option value="learning" ${c.status==="learning"?"selected":""}>Learning</option>
            <option value="learned" ${c.status==="learned"?"selected":""}>Learned</option>
          </select>

          <button data-id="${c.id}" class="delete-course">🗑</button>
        </div>
      </div>

      <div class="status-line">
        ${statusText(c, percent)}
      </div>

      <div class="progress">
        <div class="progress-bar" style="width:${percent}%;background:${color(percent)}"></div>
      </div>

      <div class="topic-box">
        ${(c.topics||[]).map((t,i)=>`
          <div class="topic-row">
            <div>
              <input type="checkbox" data-id="${c.id}" data-i="${i}" ${t.done?"checked":""}>
              ${t.name}
            </div>
            <button data-id="${c.id}" data-i="${i}" class="delete-topic">✖</button>
          </div>
        `).join("")}
      </div>

      <div style="display:flex;gap:8px;margin-top:8px;">
        <input data-topic="${c.id}" placeholder="New topic" style="flex:1;">
        <button data-add="${c.id}">Add</button>
      </div>
    `;

    coursesEl.appendChild(div);
  });

  bindEvents();
  updateSummary(data);
}

/* SUMMARY */
function updateSummary(data) {
  totalEl.textContent = data.length;
  learnedEl.textContent = data.filter(c=>c.status==="learned").length;
  learningEl.textContent = data.filter(c=>c.status==="learning").length;
  notEl.textContent = data.filter(c=>c.status==="not-learned").length;
}

/* EVENTS */
function bindEvents() {

  document.querySelectorAll(".delete-course").forEach(btn=>{
    btn.onclick = async e=>{
      await deleteDoc(doc(db,"courses",e.target.dataset.id));
    };
  });

  document.querySelectorAll(".delete-topic").forEach(btn=>{
    btn.onclick = async e=>{
      const id = e.target.dataset.id;
      const i = e.target.dataset.i;

      const course = currentData.find(c=>c.id===id);
      course.topics.splice(i,1);

      await updateDoc(doc(db,"courses",id),{
        topics: course.topics
      });
    };
  });

  document.querySelectorAll(".status").forEach(sel=>{
    sel.onchange = async e=>{
      await updateDoc(doc(db,"courses",e.target.dataset.id),{
        status:e.target.value
      });
    };
  });

  document.querySelectorAll("[data-add]").forEach(btn=>{
    btn.onclick = async e=>{
      const id = e.target.dataset.add;
      const input = document.querySelector(`[data-topic="${id}"]`);

      if(!input.value.trim()) return;

      const course = currentData.find(c=>c.id===id);
      course.topics = course.topics || [];
      course.topics.push({name:input.value,done:false});

      await updateDoc(doc(db,"courses",id),{
        topics: course.topics
      });

      input.value="";
    };
  });

  document.querySelectorAll("input[type='checkbox']").forEach(cb=>{
    cb.onchange = async e=>{
      const id = e.target.dataset.id;
      const i = e.target.dataset.i;

      const course = currentData.find(c=>c.id===id);
      course.topics[i].done = e.target.checked;

      await updateDoc(doc(db,"courses",id),{
        topics: course.topics
      });
    };
  });
}

/* REALTIME */
onSnapshot(coursesRef,(snap)=>{
  currentData = snap.docs.map(d=>({id:d.id,...d.data()}));
  render(currentData);
});

/* ADD COURSE */
addBtn.onclick = async ()=>{
  if(!courseName.value.trim()) return;

  await addDoc(coursesRef,{
    name:courseName.value,
    status:courseStatus.value,
    topics:[],
    createdAt:Date.now()
  });

  courseName.value="";
};

/* TABS */
document.querySelectorAll(".tabs button").forEach(t=>{
  t.onclick = ()=>{
    document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
    t.classList.add("active");
    currentTab = t.dataset.tab;
    render(currentData);
  };
});
