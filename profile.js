// Replace the firebaseConfig object with your project's values
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  // ...other fields
};

// Import modular SDK from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const signinBtn = document.getElementById("signin-btn");
const signoutBtn = document.getElementById("signout-btn");
const profileSection = document.getElementById("profile");
const displayNameEl = document.getElementById("display-name");
const totalEl = document.getElementById("total");
const correctEl = document.getElementById("correct");
const accuracyEl = document.getElementById("accuracy");
const attemptsContainer = document.getElementById("attempts-container");
const attemptsListCard = document.getElementById("attempts-list");

signinBtn.addEventListener("click", () => signIn());
signoutBtn.addEventListener("click", () => signOut(auth).catch(console.error));

function signIn() {
  signInWithPopup(auth, provider).catch(e => {
    console.error("Sign-in error:", e);
    alert("Sign-in failed: " + (e.message || e.code));
  });
}

onAuthStateChanged(auth, async user => {
  if (user) {
    signinBtn.style.display = "none";
    signoutBtn.style.display = "inline-block";
    profileSection.style.display = "";
    attemptsListCard.style.display = "";
    displayNameEl.textContent = user.displayName || user.email || "User";
    await loadAttempts(user.uid);
  } else {
    signinBtn.style.display = "";
    signoutBtn.style.display = "none";
    profileSection.style.display = "none";
    attemptsListCard.style.display = "none";
  }
});

async function loadAttempts(uid) {
  attemptsContainer.innerHTML = "<em>Loading...</em>";
  const attemptsRef = collection(db, "attempts");
  const q = query(attemptsRef, where("userId", "==", uid), orderBy("timestamp", "desc"));
  try {
    const snap = await getDocs(q);
    const attempts = [];
    snap.forEach(doc => attempts.push({ id: doc.id, ...doc.data() }));
    renderAttempts(attempts);
  } catch (err) {
    console.error("Failed to load attempts:", err);
    attemptsContainer.innerHTML = "<div style='color:red'>Failed to load attempts.</div>";
  }
}

function renderAttempts(attempts) {
  if (!attempts.length) {
    attemptsContainer.innerHTML = "<div>No attempts yet.</div>";
    totalEl.textContent = "0";
    correctEl.textContent = "0";
    accuracyEl.textContent = "0%";
    return;
  }

  let total = attempts.length;
  let correctCount = attempts.filter(a => a.correct).length;
  totalEl.textContent = total;
  correctEl.textContent = correctCount;
  accuracyEl.textContent = Math.round((correctCount / total) * 100) + "%";

  // Group by questionId to show per-question summary
  const byQuestion = attempts.reduce((acc, a) => {
    const qid = a.questionId || "(no-id)";
    if (!acc[qid]) acc[qid] = { questionText: a.questionText || qid, attempts: [] };
    acc[qid].attempts.push(a);
    return acc;
  }, {});

  // Render list: per-question header and recent attempts
  attemptsContainer.innerHTML = "";
  Object.values(byQuestion).forEach(group => {
    const header = document.createElement("div");
    header.style.marginTop = "0.6rem";
    header.innerHTML = `<strong>${escapeHtml(group.questionText)}</strong>`;
    attemptsContainer.appendChild(header);

    group.attempts.slice(0, 10).forEach(a => {
      const row = document.createElement("div");
      row.className = "attempt";
      const left = document.createElement("div");
      left.textContent = new Date((a.timestamp && a.timestamp.seconds) ? a.timestamp.seconds * 1000 : Date.now()).toLocaleString();
      const right = document.createElement("div");
      right.innerHTML = a.correct ? `<span class="correct">Correct</span>` : `<span class="wrong">Wrong</span>`;
      row.appendChild(left);
      row.appendChild(right);
      attemptsContainer.appendChild(row);
    });
  });
}

// helper: escape HTML to avoid injection in case questionText is user-generated
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
