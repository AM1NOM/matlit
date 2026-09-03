import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1IhcYLT1UT24ZR5ElHkgiuxjxlrKymO0",
  authDomain: "matlit2.firebaseapp.com",
  projectId: "matlit2",
  storageBucket: "matlit2.firebasestorage.app",
  messagingSenderId: "1020456806084",
  appId: "1:1020456806084:web:50cf2cc928ef6788ee4b91",
  measurementId: "G-7LW7KRP4ZY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ---- Core auth actions ----

export async function loginWithGoogle() {
    return await signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
    return await signOut(auth);
}

// ---- UI updater ----
// Handles two independent UI spots, each optional depending on the page:
//   1. Header badge on index.html   (auth-btn / header-user-pic / header-user-initial / header-default-icon / header-auth-label)
//   2. Full profile view on profile.html (login-section / profile-section)

function renderUser(user) {
    const firstName = user ? (user.displayName ? user.displayName.split(' ')[0] : "User") : null;
    const initial = firstName ? firstName.charAt(0).toUpperCase() : "";

    // ---- 1. Header badge (index.html) ----
    const headerPic = document.getElementById('header-user-pic');
    const headerInitial = document.getElementById('header-user-initial');
    const headerDefaultIcon = document.getElementById('header-default-icon');
    const headerLabel = document.getElementById('header-auth-label');

    if (headerLabel) {
        if (user) {
            headerLabel.innerText = firstName;
            headerDefaultIcon.style.display = 'none';

            if (user.photoURL) {
                headerPic.src = user.photoURL;
                headerPic.style.display = 'block';
                headerInitial.style.display = 'none';
            } else {
                headerPic.style.display = 'none';
                headerInitial.innerText = initial;
                headerInitial.style.display = 'flex';
            }
        } else {
            headerLabel.innerText = 'Login';
            headerDefaultIcon.style.display = 'block';
            headerPic.style.display = 'none';
            headerInitial.style.display = 'none';
        }
    }

    // ---- 2. Full profile view (profile.html) ----
    const loginSection = document.getElementById('login-section');
    const profileSection = document.getElementById('profile-section');

    if (loginSection && profileSection) {
        if (user) {
            loginSection.hidden = true;
            profileSection.hidden = false;

            const nameEl = document.getElementById('user-name');
            const picEl = document.getElementById('user-pic');
            const initialEl = document.getElementById('user-initial');

            const fullName = user.displayName || "User";
            if (nameEl) nameEl.innerText = fullName;

            if (user.photoURL) {
                picEl.src = user.photoURL;
                picEl.style.display = 'block';
                initialEl.style.display = 'none';
            } else {
                picEl.style.display = 'none';
                initialEl.innerText = fullName.charAt(0).toUpperCase();
                initialEl.style.display = 'flex';
            }
        } else {
            loginSection.hidden = false;
            profileSection.hidden = true;
        }
    }
}

// Runs on every page load AND right after login/logout completes
onAuthStateChanged(auth, renderUser);

// ---- Wire up buttons once the DOM is ready ----

document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const errorMsg = document.getElementById('login-error');

    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            if (errorMsg) errorMsg.hidden = true;
            try {
                await loginWithGoogle();
                // onAuthStateChanged fires automatically and updates the UI
            } catch (error) {
                console.error('Google sign-in failed:', error);
                if (errorMsg) {
                    errorMsg.innerText = "Sign-in failed. Please try again.";
                    errorMsg.hidden = false;
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await logoutUser();
            } catch (error) {
                console.error('Sign-out failed:', error);
                alert("Error signing out: " + error.message);
            }
        });
    }
});