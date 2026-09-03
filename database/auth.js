import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    GoogleAuthProvider, 
    signInWithRedirect, 
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

// Core Authentication Functions
export async function loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email, password) {
    return await createUserWithEmailAndPassword(auth, email, password);
}

// Switched to Redirect method (bypasses COOP/popup blocks)
export async function loginWithGoogle() {
    return await signInWithRedirect(auth, googleProvider);
}

export async function logoutUser() {
    return await signOut(auth);
}

// Global Auth Observer
document.addEventListener('DOMContentLoaded', () => {
    // Header UI Elements (index.html)
    const headerLoginBtn = document.getElementById('auth-login-btn');
    const headerUserInfo = document.getElementById('auth-user-info');
    const headerUserPic = document.getElementById('header-user-pic');
    const headerUserInitial = document.getElementById('header-user-initial');
    const headerUserName = document.getElementById('header-user-name');

    // Profile Page Elements (profile.html)
    const loginSection = document.getElementById('login-section');
    const profileSection = document.getElementById('profile-section');

    onAuthStateChanged(auth, (user) => {
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

                document.getElementById('user-name').innerText = user.displayName || firstName;
                document.getElementById('user-email').innerText = user.email;

                const userPic = document.getElementById('user-pic');
                const userInitial = document.getElementById('user-initial');

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

    // Event Listeners for Forms and Buttons
    const loginForm = document.getElementById('login-form');
    const googleBtn = document.getElementById('google-login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorMsg = document.getElementById('login-error');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.hidden = true;
            try {
                await loginWithEmail(emailInput.value, passwordInput.value);
                window.location.href = 'index.html';
            } catch (error) {
                errorMsg.innerText = error.message;
                errorMsg.hidden = false;
            }
        });

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
                    await loginWithGoogle(); // Triggers page redirect
                } catch (error) {
                    errorMsg.innerText = error.message;
                    errorMsg.hidden = false;
                }
            });
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await logoutUser();
            } catch (error) {
                alert("Error signing out: " + error.message);
            }
        });
    }
});