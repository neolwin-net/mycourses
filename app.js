import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const courseInput = document.getElementById('courseName');
const statusSelect = document.getElementById('courseStatus');
const coursesEl = document.getElementById('courses');
const addBtn = document.getElementById('addCourseBtn');

const tabBtns = document.querySelectorAll('.tabs button');

const summaryEls = {
  total: document.getElementById('total'),
  learned: document.getElementById('learnedCount'),
  learning: document.getElementById('learningCount'),
  not: document.getElementById('notCount')
};

let currentTab = 'all';
let isReadOnly = false;

const coursesRef = collection(db, "courses");

function progress(course) {
  if (course.status === 'not-learned') return 0;
  if (course.status === 'learned') return 100;
  if (!course.topics?.length) return 0;
  return Math.round(course.topics.filter(t => t.done).length / course.topics.length * 100);
}

function updateSummary(courses) {
  summaryEls.total.textContent = courses.length;
  summaryEls.learned.textContent = courses.filter(c => c.status === 'learned').length;
  summaryEls.learning.textContent = courses.filter(c => c.status === 'learning').length;
  summaryEls.not.textContent = courses.filter(c => c.status === 'not-learned').length;
}

function render(courses) {
  coursesEl.innerHTML = '';

  courses.forEach(c => {
    if (currentTab !== 'all' && c.status !== currentTab) return;

    const percent = progress(c);

    const div = document.createElement('div');
    div.className = 'course';

    let html = `<strong>${c.name}</strong>`;

    html += `
    <select data-id="${c.id}" class="status" ${isReadOnly?'disabled':''}>
      <option value="not-learned" ${c.status==='not-learned'?'selected':''}>Need to Learn</option>
      <option value="learning" ${c.status==='learning'?'selected':''}>Learning</option>
      <option value="learned" ${c.status==='learned'?'selected':''}>Learned</option>
    </select>`;

    html += ` ${percent}%`;

    html += ` <button data-id="${c.id}" class="delete-course">✖</button>`;

    if (c.status === 'learning') {
      html += `<div>Topics:</div>`;

      (c.topics || []).forEach((t, ti) => {
        html += `
        <div>
          <input type="checkbox" data-id="${c.id}" data-ti="${ti}" ${t.done ? 'checked' : ''}>
          ${t.name}
        </div>`;
      });

      html += `
      <input placeholder="New topic" data-topic="${c.id}">
      <button data-add-topic="${c.id}">Add</button>`;
    }

    div.innerHTML = html;
    coursesEl.appendChild(div);
  });

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('.delete-course').forEach(btn => {
    btn.onclick = async e => {
      await deleteDoc(doc(db, "courses", e.target.dataset.id));
    };
  });

  document.querySelectorAll('.status').forEach(sel => {
    sel.onchange = async e => {
      await updateDoc(doc(db, "courses", e.target.dataset.id), {
        status: e.target.value
      });
    };
  });

  document.querySelectorAll('[data-add-topic]').forEach(btn => {
    btn.onclick = async e => {
      const id = e.target.dataset.addTopic;
      const input = document.querySelector(`[data-topic="${id}"]`);
      if (!input.value.trim()) return;

      const course = currentCourses.find(c => c.id === id);
      const topics = course.topics || [];

      topics.push({ name: input.value, done: false });

      await updateDoc(doc(db, "courses", id), { topics });

      input.value = '';
    };
  });

  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.onchange = async e => {
      const { id, ti } = e.target.dataset;
      const course = currentCourses.find(c => c.id === id);

      course.topics[ti].done = e.target.checked;

      await updateDoc(doc(db, "courses", id), {
        topics: course.topics
      });
    };
  });
}

let currentCourses = [];

onSnapshot(coursesRef, snapshot => {
  currentCourses = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  render(currentCourses);
  updateSummary(currentCourses);
});

addBtn.onclick = async () => {
  const name = courseInput.value.trim();
  if (!name) return;

  await addDoc(coursesRef, {
    name,
    status: statusSelect.value,
    topics: [],
    createdAt: Date.now()
  });

  courseInput.value = '';
};

tabBtns.forEach(btn => {
  btn.onclick = e => {
    tabBtns.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentTab = e.target.dataset.tab;
    render(currentCourses);
  };
});
