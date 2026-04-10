import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyAA-vT5YCkaHZ9Tol3VtGUkEywU8Oz0DeQ",
  authDomain: "neocourses-51855.firebaseapp.com",
  projectId: "neocourses-51855",
  storageBucket: "neocourses-51855.firebasestorage.app",
  messagingSenderId: "570548997073",
  appId: "1:570548997073:web:71045486dbbf7fe0b42ef0"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
