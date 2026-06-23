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
    deleteDoc
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged
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


    let data = "";


    querySnapshot.forEach((parkingDoc) => {

        const parking = parkingDoc.data();
        const parkingId = parkingDoc.id;

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
onAuthStateChanged(auth, (user) => {

    if(user) {

        loadMyParking(user);

    }

});