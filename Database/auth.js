import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Replace these with your actual Firebase project config keys
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

export async function loginWithGoogle() {
    return await signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
    return await signOut(auth);
}

export function observeAuthState(callback) {
    onAuthStateChanged(auth, callback);
}

// Login Page UI Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const googleBtn = document.getElementById('google-login-btn');

    // Only attach events if we are currently on the login page
    if (loginForm && googleBtn) {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorMsg = document.getElementById('login-error');

        // Email/Password Login Form
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

        // Google Sign-In Button
        googleBtn.addEventListener('click', async () => {
            errorMsg.hidden = true;
            try {
                await loginWithGoogle();
                window.location.href = 'index.html';
            } catch (error) {
                errorMsg.innerText = error.message;
                errorMsg.hidden = false;
            }
        });
    }
});