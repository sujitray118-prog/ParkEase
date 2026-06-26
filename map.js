// Firebase imports
import { initializeApp } from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    increment,
    serverTimestamp
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// Your Firebase configuration
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
let currentUserData = null;
//Create Map
const map = L.map("map").setView([22.95, 88.45], 15);

let followLocation = true;

//Html Elements
const output = document.getElementById("parking-list");
const vehicleFilter = document.getElementById("vehicleFilter");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
searchBtn.onclick = () => {
    console.log("BUTTON TEST WORKING");
};
console.log("Search button found:", searchBtn);

// ============================
// Location Autocomplete Search
// ============================

const suggestions = document.getElementById("suggestions");

let searchTimeout;

searchInput.addEventListener("input", () => {

    clearTimeout(searchTimeout);

    const query = searchInput.value.trim();

    // Don't search for very small text
    if (query.length < 3) {

        suggestions.innerHTML = "";
        return;
    }


    searchTimeout = setTimeout(async () => {

        try {

            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`
            );

            const places = await response.json();


            suggestions.innerHTML = "";


            places.forEach((place) => {

                const item = document.createElement("div");

                item.className = "suggestion-item";


                item.innerHTML = `
                    📍 ${place.display_name}
                `;


                item.addEventListener("click", () => {


                    // Put selected name in search box
                    searchInput.value =
                        place.display_name;


                    // Remove suggestion list
                    suggestions.innerHTML = "";
                    suggestions.style.display = "none";


                    // Move map to selected location
                    followLocation = false;

                    map.flyTo(
                        [
                            place.lat,
                            place.lon
                        ],
                        13
                    );

                });


                suggestions.appendChild(item);

            });


        } 
        catch(error) {

            console.log(
                "Search error:",
                error
            );

        }

    }, 400);

});


let allParking = [];
let parkingMarkers = [];

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

window.zoomToParking = function(lat, lng) {
    map.flyTo([lat, lng], 19);
};

//====Red Marker for User Location====
const redIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41],
    popupAnchor: [1, -34]
});
let userLocationCircle;
let firstLocation = true;

if (navigator.geolocation) {

    let userMarker;
    let accuracyCircle;

    navigator.geolocation.watchPosition(
        function(position) {

            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            // make map follow the user
            if (followLocation) {
                map.setView([userLat, userLng], 15);
            }
            // Fly to user location only once
            if (firstLocation) {
                map.flyTo([userLat, userLng], 17);
                firstLocation = false;
            }

            // If the blue dot already exists, move it
            if (userMarker) {
            map.removeLayer(userMarker);
        }

        if (accuracyCircle) {
            map.removeLayer(accuracyCircle);
        }

        // Blue location dot
        userMarker = L.circleMarker([userLat, userLng], {
            radius: 8,
            color: "#ffffff",
            weight: 2,
            fillColor: "#0077ff",
            fillOpacity: 1
        }).addTo(map);

        // Accuracy area
        accuracyCircle = L.circle([userLat, userLng], {
            radius: accuracy,
            color: "#0077ff",
            fillColor: "#0077ff",
            fillOpacity: 0.15,
            weight: 1
        }).addTo(map);

    },


        function(error) {
            console.error("Location error:", error);
        },

        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );

} else {
    alert("Geolocation is not supported by this browser.");
}

//Function to automatically load parking zones from firebase
async function loadParkingZones() {

    try {

        // CHANGE THIS TO YOUR COLLECTION NAME
        const querySnapshot = await getDocs(
            collection(db, "parkingzone")
        );

        console.log("DATA RECEIVED FROM FIREBASE");

        let data = "";

        querySnapshot.forEach((doc) => {

            console.log("INSIDE FOREACH LOOP");

            const parking = doc.data();

            parking.id = doc.id;
            allParking.push(parking);

            console.log("FIREBASE DATA:", parking);

            //create Marker from firebase Data
            


            // SHOW DATA ON WEBSITE

            
        });

        displayParking(allParking);

    }
    catch(error) {

        console.error("FIREBASE ERROR:", error);

        output.innerHTML = "Error loading data";

    }
}

function displayParking(parkingList) {

    // Clear old parking cards
    output.innerHTML = "";

    // Remove old markers from map
    parkingMarkers.forEach(marker => {
        map.removeLayer(marker);
    });

    parkingMarkers = [];


    // Create cards and markers again
    parkingList.forEach((parking) => {


        // Create marker
        const marker = L.marker(
            [
                Number(parking.Latitude),
                Number(parking.Longitude)
            ],
            {
                icon: redIcon
            }
        )
        .addTo(map)
        .bindPopup(`
            <b>${parking.Name}</b><br>
            🚗 Slots: ${parking.AvailableSlots}<br>
            🚙 Vehicle: ${parking.VehicleType}
        `);


        // Save marker
        parkingMarkers.push(marker);


        // Create parking card
        output.innerHTML += `
        <div class="parking-card">

            <h3>
                🚗 ${parking.Name}
            </h3>

            <p class="status">
                ${
                    parking.AvailableSlots > 0
                    ? "🟢 Available Now"
                    : "🔴 Parking Full"
                }
            </p>

            <p>
                🅿 Available Slots:
                <strong>
                    ${parking.AvailableSlots}
                </strong>
            </p>

            <p>
                🚙 Vehicle:
                <strong>
                    ${parking.VehicleType}
                </strong>
            </p>

            ${parking.distance !== undefined ? `
            <p>
                📍 ${parking.distance.toFixed(2)} km away
            </p>
            ` : ""}


            <div class="card-buttons">

                <button onclick="
                    zoomToParking(
                        ${parking.Latitude},
                        ${parking.Longitude}
                    )
                ">
                    📍 View on Map
                </button>


                ${
                parking.AvailableSlots > 0
                ?

                `
                <button
                class="book-btn"
                onclick="bookParking(
                '${parking.id}',
                '${parking.Name}'
                )"
                >
                📅 Book Now
                 </button>
                `

                :

                `
                <button
                class="book-btn disabled-btn"
                disabled
                >
                🚫 Parking Full
                </button>
                `
                }


            </div>

        </div>
        `;

    });

}


//Automatically run when webpage opens

loadParkingZones(); 
// Make function available to HTML
window.showSection = function(section) {

    const parking = document.getElementById("parking-list");
    const bookings = document.getElementById("bookings-section");
    const profile = document.getElementById("profile-section");

    // Hide everything first
    parking.style.display = "none";
    bookings.style.display = "none";
    profile.style.display = "none";


    // Show selected section
    if (section === "parking") {
        parking.style.display = "block";
    }

    else if (section === "bookings") {
        bookings.style.display = "block";
    }

    else if (section === "profile") {
        profile.style.display = "block";
    }
};

vehicleFilter.addEventListener("change", function() {

    const selectedVehicle = this.value;

    let filteredParking = allParking.filter(parking => {

        if (selectedVehicle === "all") {
            return true;
        }

        if (selectedVehicle === "Car") {
            return (
                parking.VehicleType === "Car" ||
                parking.VehicleType === "Both"
            );
        }

        if (selectedVehicle === "Bike") {
            return (
                parking.VehicleType === "Bike" ||
                parking.VehicleType === "Both"
            );
        }

        return true;

    });

    displayParking(filteredParking);

});

// Check logged-in user and load profile data
onAuthStateChanged(auth, async (user) => {

    if (user) {

        try {

            // Get user data from Firestore
            const userRef = doc(db, "users", user.uid);

            const userSnap = await getDoc(userRef);


            if (userSnap.exists()) {

                const userData = userSnap.data();
                currentUserData = {
                    uid: user.uid,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role
                };


                // Show actual name
                document.getElementById("user-name").textContent =
                    userData.name;


                // Show email
                document.getElementById("user-email").textContent =
                    userData.email;


                // Show role
                document.getElementById("user-role").textContent =
                    userData.role;

            }

            else {

                document.getElementById("user-name").textContent =
                    "Unknown User";

                document.getElementById("user-email").textContent =
                    user.email;

                document.getElementById("user-role").textContent =
                    "Not Assigned";

            }

        }

        catch(error) {

            console.log("Profile Error:", error);

        }

    }

    else {

        // User is not logged in
        window.location.href = "login.html";

    }

});

document.getElementById("logout-btn")
.addEventListener("click", async () => {

    try {

        await signOut(auth);

        alert("Logged out successfully!");

        window.location.href = "login.html";

    } 
    catch(error) {

        console.error(error);

        alert("Logout failed");

    }

});

// Book a parking slot
window.bookParking = async function(parkingId, parkingName) {

    const user = auth.currentUser;

    if (!user) {
        alert("Please login first!");
        return;
    }

    try {

        // Save booking
        await addDoc(collection(db, "bookings"), {

            userId: user.uid,
            parkingId: parkingId,
            parkingName: parkingName,
            bookingTime: serverTimestamp(),
            status: "Active"

        });

        // Reduce slot by 1
        const parkingRef = doc(db, "parkingzone", parkingId);

        console.log("Updating parking:", parkingId);

        await updateDoc(parkingRef, {
            AvailableSlots: increment(-1)
        });

        console.log("Slot updated successfully");

        alert("✅ Parking booked successfully!");

        // Refresh parking list
        allParking = [];
        loadParkingZones();

    }

    catch(error) {

        console.error(error);

        alert("Booking Failed");

    }

};

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371; // Radius of Earth in km

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;


    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;


    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );


    return R * c;
}

searchBtn.addEventListener("click", async () => {

    console.log("Search button clicked");

    const place = searchInput.value.trim();

    if (!place) {
        alert("Please enter a location");
        return;
    }

    try {

        // Search location using Nominatim
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${place}`
        );

        const locations = await response.json();


        if (locations.length === 0) {

            alert("Location not found");
            return;

        }


        const lat = Number(locations[0].lat);
        const lng = Number(locations[0].lon);


        // Move map to searched location
        followLocation = false;
        map.flyTo([lat, lng], 14);

        // Find nearby parking
let nearbyParking = allParking.filter(parking => {

    const distance = calculateDistance(
        lat,
        lng,
        Number(parking.Latitude),
        Number(parking.Longitude)
    );

    console.log(
        parking.Name,
        "Distance:",
        distance,
        "KM"
    );

    parking.distance = distance;

    return distance <= 100;

});


// Sort nearest parking first
nearbyParking.sort((a, b) => {
    return a.distance - b.distance;
});


// Check if parking is found
if (nearbyParking.length > 0) {

    displayParking(nearbyParking);

}

else {

    // Clear previous cards and markers
    displayParking([]);

    output.innerHTML = `
        <div class="parking-card">
            <h3>
                😔 No parking available nearby
            </h3>

            <p>
                Try searching another location.
            </p>
        </div>
    `;

}

    }

    catch(error) {

        console.error(error);

        alert("Search failed");

    }

});

