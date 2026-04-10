import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const courseName = document.getElementById("courseName");
const courseStatus = document.getElementById("courseStatus");
const coursesEl = document.getElementById("courses");

const totalEl = document.getElementById("total");
const learnedEl = document.getElementById("learnedCount");
const learningEl = document.getElementById("learningCount");
const notEl = document.getElementById("notCount");

const addBtn = document.getElementById("addCourseBtn");
const tabs = document.querySelectorAll(".tabs button");

let currentTab = "all";
let currentData = [];

const coursesRef = collection(db, "courses");

function calcProgress(course) {
  if (course.status === "not-learned") return 0;
  if (course.status === "learned") return 100;
  if (!course.topics?.length) return 0;
  return Math.round(course.topics.filter(t => t.done).length / course.topics.length * 100);
}

function render(data) {
  coursesEl.innerHTML = "";

  data.forEach(c => {
    if (currentTab !== "all" && c.status !== currentTab) return;

    const div = document.createElement("div");
    div.className = "course";

    div.innerHTML = `
      <strong>${c.name}</strong>

      <select data-id="${c.id}" class="status">
        <option value="not-learned" ${c.status==="not-learned"?"selected":""}>Need</option>
        <option value="learning" ${c.status==="learning"?"selected":""}>Learning</option>
        <option value="learned" ${c.status==="learned"?"selected":""}>Learned</option>
      </select>

      <button data-id="${c.id}" class="delete">✖</button>

      <div>${calcProgress(c)}%</div>

      ${c.status==="learning" ? `
        ${(c.topics||[]).map((t,i)=>`
          <div>
            <input type="checkbox" data-id="${c.id}" data-i="${i}" ${t.done?"checked":""}>
            ${t.name}
          </div>
        `).join("")}

        <input data-topic="${c.id}" placeholder="New topic">
        <button data-add="${c.id}">Add</button>
      ` : ""}
    `;

    coursesEl.appendChild(div);
  });

  bindEvents();
  updateSummary(data);
}

function updateSummary(data) {
  totalEl.textContent = data.length;
  learnedEl.textContent = data.filter(c=>c.status==="learned").length;
  learningEl.textContent = data.filter(c=>c.status==="learning").length;
  notEl.textContent = data.filter(c=>c.status==="not-learned").length;
}

function bindEvents() {

  document.querySelectorAll(".delete").forEach(btn => {
    btn.onclick = async e => {
      await deleteDoc(doc(db, "courses", e.target.dataset.id));
    };
  });

  document.querySelectorAll(".status").forEach(sel => {
    sel.onchange = async e => {
      await updateDoc(doc(db, "courses", e.target.dataset.id), {
        status: e.target.value
      });
    };
  });

  document.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.onchange = async e => {
      const id = e.target.dataset.id;
      const i = e.target.dataset.i;

      const course = currentData.find(c => c.id === id);
      course.topics[i].done = e.target.checked;

      await updateDoc(doc(db, "courses", id), {
        topics: course.topics
      });
    };
  });

  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.onclick = async e => {
      const id = e.target.dataset.add;
      const input = document.querySelector(`[data-topic="${id}"]`);

      if (!input.value.trim()) return;

      const course = currentData.find(c => c.id === id);
      course.topics = course.topics || [];
      course.topics.push({ name: input.value, done: false });

      await updateDoc(doc(db, "courses", id), {
        topics: course.topics
      });

      input.value = "";
    };
  });
}

onSnapshot(coursesRef, snap => {
  currentData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  render(currentData);
});

addBtn.onclick = async () => {
  if (!courseName.value.trim()) return;

  await addDoc(coursesRef, {
    name: courseName.value,
    status: courseStatus.value,
    topics: [],
    createdAt: Date.now()
  });

  courseName.value = "";
};

tabs.forEach(t => {
  t.onclick = () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    currentTab = t.dataset.tab;
    render(currentData);
  };
});
