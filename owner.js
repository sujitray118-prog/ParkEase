// Firebase imports
import { initializeApp } from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    deleteDoc,
    documentId
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


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

const db = getFirestore(app);
const auth = getAuth(app);


// Get form
const parkingForm = document.getElementById("parkingForm");


parkingForm.addEventListener("submit", async (e) => {

    e.preventDefault();


    // Get owner details
    const user = auth.currentUser;


    if(!user){
        alert("Please login first!");
        return;
    }


    // Get form values
    const parkingName =
        document.getElementById("parkingName").value;

    const slots =
        document.getElementById("slots").value;

    const price =
        document.getElementById("price").value;

    const vehicle =
        document.getElementById("vehicle").value;

    const latitude =
        document.getElementById("latitude").value;

    const longitude =
        document.getElementById("longitude").value;


    try {

        // Add parking to Firestore
        await addDoc(collection(db, "parkingzone"), {

            Name: parkingName,

            AvailableSlots: Number(slots),

            Price: Number(price),

            VehicleType: vehicle,

            Latitude: Number(latitude),

            Longitude: Number(longitude),

            OwnerID: user.uid,

            CreatedAt: new Date()

        });
        console.log("Parking added to Firestore");


        alert("Parking added successfully!");


        // Clear form
        parkingForm.reset();
        loadMyParking(auth.currentUser);


    } catch(error) {

        alert("Error: " + error.message);

        console.log(error);

    }

});
async function loadMyParking() {

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const myParkingList =
        document.getElementById("myParkingList");

    myParkingList.innerHTML = "Loading your parking...";


    const q = query(
        collection(db, "parkingzone"),
        where("OwnerID", "==", user.uid)
    );


    const querySnapshot = await getDocs(q);

    // Update total parking count on Dashboard
    // Update dashboard cards
document.getElementById("totalParking").textContent =
    querySnapshot.size;

let totalAvailableSlots = 0;
let totalEarnings = 0;
    let data = "";


    querySnapshot.forEach((parkingDoc) => {

        const parking = parkingDoc.data();
        const parkingId = parkingDoc.id;

        totalAvailableSlots += Number(parking.AvailableSlots);

        data += `
            <div class="parking-card">

                <h3>🅿 ${parking.Name}</h3>

                <p>
                    Available Slots:
                    ${parking.AvailableSlots}
                </p>

                <p>
                    Vehicle:
                    ${parking.VehicleType}
                </p>

                <p class="status">
                    🟢 No bookings yet
                </p>
                <button onclick="deleteParking('${parkingId}')">
                    Delete Parking
                </button>

                <hr>

            </div>
        `;

    });

    document.getElementById("availableSlots").textContent =
    totalAvailableSlots;

    if (data === "") {

        data = `
            <p>
                You have not added any parking yet.
            </p>
        `;

    }


    myParkingList.innerHTML = data;

}
window.deleteParking = async function(parkingId) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this parking?"
    );

    if(!confirmDelete) {
        return;
    }

    try {

        await deleteDoc(
            doc(db, "parkingzone", parkingId)
        );

        alert("Parking deleted successfully!");

        // Refresh the list
        loadMyParking(auth.currentUser);

    }
    catch(error) {

        console.error(error);

        alert("Failed to delete parking");

    }
};

onAuthStateChanged(auth, async (user) => {

    if (user) {

        // Load owner's parking
        loadMyParking();
        loadDashboardStats();
        loadRecentBookings();


        // Get owner details from Firestore
        const userRef = doc(db, "users", user.uid);

        const userSnap = await getDoc(userRef);


        if (userSnap.exists()) {

            const userData = userSnap.data();

            document.getElementById("ownerName").textContent =
                userData.name;

            document.getElementById("ownerEmail").textContent =
                userData.email;

            document.getElementById("ownerRole").textContent =
                userData.role;

        }

    } else {

        // If not logged in, send to login page
        window.location.href = "login.html";

    }

});

async function loadDashboardStats() {

    const user = auth.currentUser;

    if (!user) return;

    // ==========================
    // Owner Parking
    // ==========================

    const parkingQuery = query(
        collection(db, "parkingzone"),
        where("OwnerID", "==", user.uid)
    );

    const parkingSnapshot = await getDocs(parkingQuery);

    document.getElementById("totalParking").textContent =
        parkingSnapshot.size;

    let parkingIds = [];
    let parkingPrices = {};

    let totalAvailable = 0;

    parkingSnapshot.forEach((parkingDoc) => {

        const parking = parkingDoc.data();

        parkingIds.push(parkingDoc.id);

        parkingPrices[parkingDoc.id] =
            Number(parking.Price);

        totalAvailable +=
            Number(parking.AvailableSlots);

    });

    document.getElementById("availableSlots").textContent =
        totalAvailable;

    // ==========================
    // Bookings
    // ==========================

    const bookingSnapshot =
        await getDocs(collection(db, "bookings"));

    let bookingCount = 0;

    let totalEarnings = 0;

    let recentHtml = "";

    bookingSnapshot.forEach((bookingDoc) => {

        const booking = bookingDoc.data();

        if (
            parkingIds.includes(booking.parkingId) &&
            booking.status === "Active"
        ) {

            bookingCount++;

            const hours =
                booking.hours || 1;

            totalEarnings +=
                (parkingPrices[booking.parkingId] || 0) * hours;

            let bookingDate = "N/A";

            if (
                booking.bookingTime &&
                booking.bookingTime.toDate
            ) {

                bookingDate =
                    booking.bookingTime
                    .toDate()
                    .toLocaleString();

            }

            recentHtml += `

            <div class="parking-card">

                <h3>${booking.parkingName}</h3>

                <p>
                    <strong>Booked By:</strong>
                    ${booking.userName || "Unknown"}
                </p>

                <p>
                    <strong>Hours:</strong>
                    ${hours}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${booking.status}
                </p>

                <p>
                    <strong>Booked On:</strong>
                    ${bookingDate}
                </p>

            </div>

            `;

        }

    });

    document.getElementById("totalBookings").textContent =
        bookingCount;

    document.getElementById("totalEarnings").textContent =
        "₹" + totalEarnings;

    if (recentHtml === "") {

        recentHtml =
            "<p>No bookings yet.</p>";

    }

    document.getElementById("recentBookings").innerHTML =
        recentHtml;

}

// Make sidebar navigation work
window.showSection = function(section) {

    const dashboard = document.getElementById("dashboard-section");
    const parking = document.getElementById("parking-section");
    const earnings = document.getElementById("earnings-section");
    const profile = document.getElementById("profile-section");

    // Hide all sections
    dashboard.style.display = "none";
    parking.style.display = "none";
    earnings.style.display = "none";
    profile.style.display = "none";

    // Show selected section
    if (section === "dashboard") {
        dashboard.style.display = "block";
    }

    else if (section === "parking") {
        parking.style.display = "block";
    }

    else if (section === "earnings") {
        earnings.style.display = "block";
    }

    else if (section === "profile") {
        profile.style.display = "block";
    }

};

async function loadRecentBookings() {

    const user = auth.currentUser;

    if (!user) return;

    const recentBookings =
        document.getElementById("recentBookings");

    recentBookings.innerHTML = "Loading...";

    const q = query(
        collection(db, "bookings"),
        where("ownerId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {

        recentBookings.innerHTML =
            "<p>No bookings yet.</p>";

        return;
    }

    let html = "";

    snapshot.forEach(doc => {

        const booking = doc.data();

        let bookingDate = "Time not available";

        if (
            booking.bookingTime &&
            typeof booking.bookingTime.toDate === "function"
        ) {
           bookingDate =
               booking.bookingTime.toDate().toLocaleString();
        }

        html += `
            <div class="parking-card">

                <h3>${booking.parkingName}</h3>

                <p><strong>Booked By:</strong> ${booking.userName || "N/A"}</p>

                <p><strong>Hours:</strong> ${booking.hours || 1}</p>

                <p><strong>Status:</strong> ${booking.status}</p>

                <p><strong>Booked On:</strong> ${bookingDate}</p>

            </div>
        `;
    });

    recentBookings.innerHTML = html;
}

document.getElementById("logoutBtn").addEventListener("click", async () => {

    try{

        await signOut(auth);

        alert("Logged out successfully!");

        window.location.href = "login.html";

    }

    catch(error){

        console.error(error);

        alert("Logout Failed");

    }

});