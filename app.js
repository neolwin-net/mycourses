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

/* ENTER KEY */
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

/* RENDER */
function render(data) {
  coursesEl.innerHTML = "";

  data.forEach(c => {
    if (currentTab !== "all" && c.status !== currentTab) return;

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
        ${(c.topics||[]).map((t,i)=>`
          <div>
            <input type="checkbox" data-id="${c.id}" data-i="${i}" ${t.done?"checked":""}>
            ${t.name}
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
      course.topics.push({name:input.value,done:false});

      await updateDoc(doc(db,"courses",id),{topics:course.topics});
      input.value="";
    };
  });

  document.querySelectorAll("input[type='checkbox']").forEach(cb=>{
    cb.onchange = async e=>{
      const id = e.target.dataset.id;
      const i = e.target.dataset.i;

      const course = currentData.find(c=>c.id===id);
      course.topics[i].done = e.target.checked;

      await updateDoc(doc(db,"courses",id),{topics:course.topics});
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
