import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
<<<<<<< HEAD
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
=======
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    GoogleAuthProvider, 
    signInWithPopup,
    signOut, 
    onAuthStateChanged 
>>>>>>> b43eb5f7b2bd7dadd1a1eb89d5a9ec935012a8c9
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

<<<<<<< HEAD
// ---- Core auth actions ----

=======
// Configure Google provider to persist session
googleProvider.setCustomParameters({
    'prompt': 'select_account'
});

// Core Authentication Functions
export async function loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email, password) {
    return await createUserWithEmailAndPassword(auth, email, password);
}

// Use popup instead of redirect to maintain session better
>>>>>>> b43eb5f7b2bd7dadd1a1eb89d5a9ec935012a8c9
export async function loginWithGoogle() {
    return await signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
    return await signOut(auth);
}

<<<<<<< HEAD
// ---- UI updater: shows profile pic/initial + name, or the login button ----

function renderUser(user) {
    const loginSection = document.getElementById('login-section');
    const profileSection = document.getElementById('profile-section');

    // If this page doesn't have these elements, nothing to do.
    if (!loginSection || !profileSection) return;

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

// Runs on every page load AND right after login/logout completes
onAuthStateChanged(auth, renderUser);

// ---- Wire up buttons once the DOM is ready ----

document.addEventListener('DOMContentLoaded', () => {
=======
// Global Auth Observer - runs immediately on import
onAuthStateChanged(auth, (user) => {
    // Header UI Elements (index.html)
    const headerLoginBtn = document.getElementById('auth-login-btn');
    const headerUserInfo = document.getElementById('auth-user-info');
    const headerUserPic = document.getElementById('header-user-pic');
    const headerUserInitial = document.getElementById('header-user-initial');
    const headerUserName = document.getElementById('header-user-name');

    // Profile Page Elements (profile.html)
    const loginSection = document.getElementById('login-section');
    const profileSection = document.getElementById('profile-section');

    if (user) {
        const displayName = user.displayName || "";
        const emailName = user.email ? user.email.split('@')[0] : "User";
        const firstName = displayName ? displayName.split(' ')[0] : emailName;
        const initial = firstName.charAt(0).toUpperCase();

        // 1. Update index.html Header
        if (headerLoginBtn && headerUserInfo) {
            headerLoginBtn.hidden = true;
            headerUserInfo.style.display = 'flex';
            headerUserName.innerText = firstName;

            if (user.photoURL) {
                headerUserPic.src = user.photoURL;
                headerUserPic.style.display = 'block';
                headerUserInitial.style.display = 'none';
            } else {
                headerUserPic.style.display = 'none';
                headerUserInitial.innerText = initial;
                headerUserInitial.style.display = 'flex';
            }
        }

        // 2. Update profile.html View
        if (loginSection && profileSection) {
            loginSection.hidden = true;
            profileSection.hidden = false;

            const userNameEl = document.getElementById('user-name');
            const userEmailEl = document.getElementById('user-email');
            if (userNameEl) userNameEl.innerText = user.displayName || firstName;
            if (userEmailEl) userEmailEl.innerText = user.email;

            const userPic = document.getElementById('user-pic');
            const userInitial = document.getElementById('user-initial');

            if (userPic && userInitial) {
                if (user.photoURL) {
                    userPic.src = user.photoURL;
                    userPic.style.display = 'block';
                    userInitial.style.display = 'none';
                } else {
                    userPic.style.display = 'none';
                    userInitial.innerText = initial;
                    userInitial.style.display = 'flex';
                }
            }
        }
    } else {
        // Logged Out States
        if (headerLoginBtn && headerUserInfo) {
            headerLoginBtn.hidden = false;
            headerUserInfo.style.display = 'none';
        }
        if (loginSection && profileSection) {
            loginSection.hidden = false;
            profileSection.hidden = true;
        }
    }
});

// Wait for DOM and set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners for Forms and Buttons
    const loginForm = document.getElementById('login-form');
>>>>>>> b43eb5f7b2bd7dadd1a1eb89d5a9ec935012a8c9
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
<<<<<<< HEAD
=======

        if (registerBtn) {
            registerBtn.addEventListener('click', async () => {
                errorMsg.hidden = true;
                if (!emailInput.value || !passwordInput.value) {
                    errorMsg.innerText = "Please enter an email and password to register.";
                    errorMsg.hidden = false;
                    return;
                }
                try {
                    await registerWithEmail(emailInput.value, passwordInput.value);
                    window.location.href = 'index.html';
                } catch (error) {
                    errorMsg.innerText = error.message;
                    errorMsg.hidden = false;
                }
            });
        }

        if (googleBtn) {
            googleBtn.addEventListener('click', async () => {
                errorMsg.hidden = true;
                try {
                    await loginWithGoogle();
                    // Popup closes and returns to same page with user logged in
                } catch (error) {
                    errorMsg.innerText = error.message;
                    errorMsg.hidden = false;
                }
            });
        }
>>>>>>> b43eb5f7b2bd7dadd1a1eb89d5a9ec935012a8c9
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
