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

password.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

/* STATE */
let collapsedState = {};
let currentData = [];
let currentTab = "all";

const coursesRef = collection(db, "courses");

/* UI */
const coursesEl = document.getElementById("courses");
const courseName = document.getElementById("courseName");
const courseStatus = document.getElementById("courseStatus");
const addBtn = document.getElementById("addCourseBtn");

/* ✅ SUMMARY FUNCTION (ADDED) */
function updateSummary(data) {
  const total = data.length;

  const learned = data.filter(c => c.status === "learned").length;
  const learning = data.filter(c => c.status === "learning").length;
  const notLearned = data.filter(c => c.status === "not-learned").length;

  document.getElementById("total").innerText = total;
  document.getElementById("learnedCount").innerText = learned;
  document.getElementById("learningCount").innerText = learning;
  document.getElementById("notCount").innerText = notLearned;
}

/* RENDER */
function render(data) {
  coursesEl.innerHTML = "";

  data.forEach(c => {
    if (currentTab !== "all" && c.status !== currentTab) return;

    const total = (c.topics || []).length;
    const done = (c.topics || []).filter(t => t.done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    const div = document.createElement("div");
    div.className = "course" + (collapsedState[c.id] ? " collapsed" : "");

    div.innerHTML = `
      <div class="course-header">
        <strong>${c.name}</strong>

        <div>
          <button class="toggleBtn">
            ${collapsedState[c.id] ? "+" : "−"}
          </button>

          <select data-id="${c.id}" class="status">
            <option value="not-learned" ${c.status==="not-learned"?"selected":""}>Need</option>
            <option value="learning" ${c.status==="learning"?"selected":""}>Learning</option>
            <option value="learned" ${c.status==="learned"?"selected":""}>Learned</option>
          </select>

          <button data-id="${c.id}" class="delete-course">🗑</button>
        </div>
      </div>

      <div class="course-content">

        <div class="status-line">
          ${done}/${total} completed (${percent}%)
        </div>

        <div class="progress">
          <div class="progress-bar" style="
            width:${percent}%;
            background:${percent===100 ? 'var(--good)' :
                        percent>=50 ? 'var(--mid)' :
                        'var(--bad)'}">
          </div>
        </div>

        ${(c.topics||[]).map((t,i)=>`
          <div class="topic-row">
            <div>
              <input type="checkbox" data-id="${c.id}" data-i="${i}" ${t.done?"checked":""}>
              ${t.name}
            </div>
            <button data-id="${c.id}" data-i="${i}" class="delete-topic">✖</button>
          </div>
        `).join("")}

        <input data-topic="${c.id}" placeholder="New topic">
        <button data-add="${c.id}">Add</button>
      </div>
    `;

    coursesEl.appendChild(div);
  });

  bindEvents();
}

/* EVENTS */
function bindEvents() {

  document.querySelectorAll(".toggleBtn").forEach(btn=>{
    btn.onclick = ()=>{
      const course = btn.closest(".course");
      const id = course.querySelector(".status").dataset.id;

      collapsedState[id] = !collapsedState[id];
      course.classList.toggle("collapsed");

      btn.textContent = collapsedState[id] ? "+" : "−";
    };
  });

  document.querySelectorAll("[data-add]").forEach(btn=>{
    btn.onclick = async e=>{
      const id = e.target.dataset.add;
      const input = document.querySelector(`[data-topic="${id}"]`);

      if(!input.value.trim()) return;

      const course = currentData.find(c=>c.id===id);
      if (!course) return;

      const newTopics = [...(course.topics || []), {
        name: input.value,
        done: false
      }];

      await updateDoc(doc(db,"courses",id),{
        topics: newTopics
      });

      input.value="";
    };
  });

  document.querySelectorAll("input[type='checkbox']").forEach(cb=>{
    cb.onchange = async e=>{
      const id = e.target.dataset.id;
      const i = parseInt(e.target.dataset.i);

      const course = currentData.find(c=>c.id===id);
      if (!course || !course.topics || !course.topics[i]) return;

      const newTopics = course.topics.map((t, index) =>
        index === i ? { ...t, done: e.target.checked } : t
      );

      await updateDoc(doc(db,"courses",id),{
        topics: newTopics
      });
    };
  });

  document.querySelectorAll(".delete-topic").forEach(btn=>{
    btn.onclick = async e=>{
      const id = e.target.dataset.id;
      const i = parseInt(e.target.dataset.i);

      const course = currentData.find(c=>c.id===id);
      if (!course || !course.topics) return;

      const newTopics = course.topics.filter((_, index) => index !== i);

      await updateDoc(doc(db, "courses", id), {
        topics: newTopics
      });
    };
  });

  document.querySelectorAll(".delete-course").forEach(btn=>{
    btn.onclick = async e=>{
      await deleteDoc(doc(db,"courses",e.target.dataset.id));
    };
  });

  document.querySelectorAll(".status").forEach(sel=>{
    sel.onchange = async e=>{
      await updateDoc(doc(db,"courses",e.target.dataset.id),{
        status:e.target.value
      });
    };
  });
}

/* REALTIME */
onSnapshot(coursesRef,(snap)=>{
  currentData = snap.docs.map(d=>({id:d.id,...d.data()}));

  render(currentData);
  updateSummary(currentData); // ✅ FIXED
});

/* ADD COURSE */
addBtn.onclick = async ()=>{
  if(!courseName.value.trim()) return;

  await addDoc(coursesRef,{
    name:courseName.value,
    status:courseStatus.value,
    topics:[]
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
