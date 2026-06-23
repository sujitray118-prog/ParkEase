// Firebase imports
import { initializeApp } from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCXSKRuYrHdWcuB3-6NQlcwGGYF_xunNak",
    authDomain: "parkease-10fbe.firebaseapp.com",
    projectId: "parkease-10fbe",
    storageBucket: "parkease-10fbe.firebasestorage.app",
    messagingSenderId: "881669215891",
    appId: "1:881669215891:web:b2db8916684245b4dd1f66",
    measurementId: "G-GRCKNGW077"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// Signup form
const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const role = document.querySelector(
            'input[name="role"]:checked'
        ).value;

        try {

            // Create account in Firebase Authentication
            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            // Store additional details in Firestore
            await setDoc(
                doc(db, "users", user.uid),
                {
                    name: name,
                    email: email,
                    role: role,
                    createdAt: new Date()
                }
            );

            alert("Account created successfully!");

            // Redirect based on role
            if (role === "driver") {
                window.location.href = "map.html";
            } else {
                alert(
                    "Owner dashboard coming soon!"
                );
            }

        } catch (error) {
            alert(
                "Error: " + error.message
            );
            console.log(error);
        }
    });
}
// Login form
const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {

            // Login user
            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;


            // Get user data from Firestore
            const userRef = doc(db, "users", user.uid);

            const userSnap = await getDoc(userRef);


            if (userSnap.exists()) {

                const userData = userSnap.data();


                if (userData.role === "driver") {

                    window.location.href = "map.html";

                } else if (userData.role === "owner") {

                    window.location.href = "owner.html";

                }

            }

        } catch(error) {

            alert(
                "Login Failed: " + error.message
            );

            console.log(error);

        }

    });

}