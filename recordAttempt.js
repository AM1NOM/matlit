// Example helper you can call from your quiz logic when the user finishes an attempt.
// Usage: import { recordAttempt } from './recordAttempt.js'; recordAttempt({ questionId, questionText, correct });

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export async function recordAttempt({ questionId, questionText, correct }) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in");

  const attemptsRef = collection(db, "attempts");
  return addDoc(attemptsRef, {
    userId: user.uid,
    questionId,
    questionText,
    correct: !!correct,
    timestamp: serverTimestamp()
  });
}
