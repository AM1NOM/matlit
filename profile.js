// profile.js
// Profile page: list user's wrong_questions subcollection
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ====== IMPORTANT ======
 Replace this firebaseConfig with the same config you use in your main app.
 If your app already initializes the Firebase app (initializeApp(...)) globally,
 remove the initializeApp call below and instead import/get the existing app.
========================= */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const userPic = document.getElementById('userPic');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const listEl = document.getElementById('list');
const loadingEl = document.getElementById('loading');
const filterSelect = document.getElementById('filterSelect');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

let currentUid = null;
let cachedDocs = []; // store docs as objects { id, ...data }

// format timestamp (Firestore Timestamp or JS Date)
function fmtDate(ts) {
  if (!ts) return '';
  try {
    // Firestore Timestamp has toDate()
    if (ts.toDate) ts = ts.toDate();
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (e) {
    return String(ts);
  }
}

function renderList() {
  loadingEl.style.display = 'none';
  listEl.style.display = 'block';
  listEl.innerHTML = '';

  const filter = filterSelect.value; // all | still | corrected
  const filtered = cachedDocs.filter(doc => {
    if (filter === 'all') return true;
    const hasCorrected = !!doc.lastCorrect;
    return filter === 'still' ? !hasCorrected : hasCorrected;
  });

  if (!filtered.length) {
    listEl.innerHTML = '<div class="small">No history to show for this filter.</div>';
    return;
  }

  filtered.forEach(d => {
    const row = document.createElement('div');
    row.className = 'row';

    const left = document.createElement('div');
    left.className = 'left';

    const title = document.createElement('div');
    title.className = 'q-title';
    title.textContent = d.questionSnapshot ?? d.question ?? `Question ${d.id}`;

    const meta = document.createElement('div');
    meta.className = 'q-meta';
    meta.innerHTML = `Missed <strong>${d.count ?? 0}</strong> times • Last: ${fmtDate(d.lastWrong)} ${d.lastCorrect ? '• Corrected: ' + fmtDate(d.lastCorrect) : ''}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement('div');
    right.className = 'actions';

    const badge = document.createElement('div');
    badge.className = 'badge ' + (d.lastCorrect ? 'corrected' : 'still');
    badge.textContent = d.lastCorrect ? 'Corrected' : 'Still missed';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      if (!confirm('Delete this record from your history?')) return;
      try {
        await deleteDoc(doc(db, 'users', currentUid, 'wrong_questions', d.id));
        // refresh local cache (simple re-fetch)
        await fetchDocs();
      } catch (err) {
        console.error('Delete failed', err);
        alert('Failed to delete: ' + (err.message || err));
      }
    });

    right.appendChild(badge);
    right.appendChild(delBtn);

    row.appendChild(left);
    row.appendChild(right);

    listEl.appendChild(row);
  });
}

async function fetchDocs() {
  if (!currentUid) return;
  loadingEl.style.display = '';
  listEl.style.display = 'none';
  try {
    const collRef = collection(db, 'users', currentUid, 'wrong_questions');
    const q = query(collRef, orderBy('lastWrong', 'desc'));
    const snaps = await getDocs(q);
    cachedDocs = [];
    snaps.forEach(s => {
      const data = s.data();
      cachedDocs.push({
        id: s.id,
        ...data
      });
    });
    renderList();
  } catch (err) {
    console.error('Failed to load history', err);
    loadingEl.textContent = 'Error loading history';
  }
}

filterSelect.addEventListener('change', renderList);

exportBtn.addEventListener('click', () => {
  if (!cachedDocs.length) return alert('No data to export');
  const blob = JSON.stringify(cachedDocs, null, 2);
  const a = document.createElement('a');
  const file = new Blob([blob], { type: 'application/json' });
  a.href = URL.createObjectURL(file);
  a.download = 'wrong_questions_export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

clearAllBtn.addEventListener('click', async () => {
  if (!confirm('Delete all records from your wrong questions history? This cannot be undone.')) return;
  try {
    // delete each doc (client-side). For many docs consider server-side batch/cloud function.
    for (const d of cachedDocs) {
      await deleteDoc(doc(db, 'users', currentUid, 'wrong_questions', d.id));
    }
    await fetchDocs();
    alert('All records deleted.');
  } catch (err) {
    console.error('Failed to clear', err);
    alert('Failed to clear: ' + (err.message || err));
  }
});

// auth handling
onAuthStateChanged(auth, user => {
  if (user) {
    currentUid = user.uid;
    userPic.src = user.photoURL || '';
    userName.textContent = user.displayName || 'User';
    userEmail.textContent = user.email || '';
    fetchDocs();
  } else {
    currentUid = null;
    userPic.src = '';
    userName.textContent = '';
    userEmail.textContent = '';
    cachedDocs = [];
    renderList();
  }
});
