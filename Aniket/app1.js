/* =========================================================
   ParkLive — Real-time parking spot booking
   ---------------------------------------------------------
   SETUP (Firebase Realtime Database)
   1. Go to https://console.firebase.google.com and create a project.
   2. In the left menu open "Build > Realtime Database" and create a
      database (starting in test mode is fine while you build).
   3. In Project settings > General, scroll to "Your apps", add a Web
      app, and copy the config object it gives you into FIREBASE_CONFIG
      below.
   4. In Realtime Database > Rules, paste:
        {
          "rules": {
            "spots": { ".read": true, ".write": true },
            "entryLog": { ".read": true, ".write": true }
          }
        }
      This is intentionally open so the demo works with zero auth setup.
      Anyone who can read the database can see every booking's name and
      plate, so tighten this (e.g. with Firebase Auth + per-field rules)
      before using this for real customers.
   5. Open index.html in a browser. The spot grid seeds itself the first
      time it runs — no manual data entry needed.
   ========================================================= */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCpb7ySL28lbMcb5OdZ4r83dP-fEULPjf4",
    authDomain: "parking-6ec32.firebaseapp.com",
    databaseURL: "https://parking-6ec32-default-rtdb.firebaseio.com",
    projectId: "parking-6ec32",
    storageBucket: "parking-6ec32.firebasestorage.app",
    messagingSenderId: "379295756573",
    appId: "1:379295756573:web:71bf84dde7f68c8925b1f4"
};

// Change these to match the lot's real layout.
// Define parking spots manually
const SPOT_IDS = [
    'Adamas gate parking', 'AU1 parking', 'AU2 parking', 'AU3 parking', 'AU4 parking', 'AU5 parking', 'AU6 parking'

];

const state = { spots: {} };
const mySessionId = getOrCreateSessionId();
let countCache = { available: null, reserved: null, occupied: null };

if (!isConfigured()) {
    document.getElementById('setupBanner').hidden = false;
} else {
    firebase.initializeApp(FIREBASE_CONFIG);
    initApp();
}

function isConfigured() {
    return Boolean(FIREBASE_CONFIG.apiKey) &&
        FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
}

function getOrCreateSessionId() {
    let id = localStorage.getItem('parklive_session_id');

    if (!id) {
        id = crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2);

        localStorage.setItem('parklive_session_id', id);
    }

    return id;
}

function emptySpot() {
    return {
        status: 'available',
        bookedBy: null,
        vehicle: null,
        sessionId: null,
        reservedAt: null,
        enteredAt: null
    };
}
/* ---------- bootstrap ---------- */

function initApp() {
    const db = firebase.database();

    db.ref('.info/connected').on('value', snap => {
        const pill = document.getElementById('connectionPill');
        const label = document.getElementById('connectionLabel');
        const connected = snap.val() === true;
        pill.classList.toggle('connected', connected);
        label.textContent = connected ? 'Live' : 'Connecting…';
    });

    // Seed the spots node on first run only — never overwrites existing data.
    db.ref('spots').once('value').then(snapshot => {
        if (!snapshot.exists()) {
            const initial = {};
            SPOT_IDS.forEach(id => { initial[id] = emptySpot(); });
            db.ref('spots').set(initial);
        }
    });

    db.ref('spots').on('value', snapshot => {
        state.spots = snapshot.val() || {};
        renderGrid();
        updateCounts();
    });

    db.ref('entryLog').orderByChild('timestamp').limitToLast(15).on('value', snapshot => {
        const entries = [];
        snapshot.forEach(child => entries.push(child.val()));
        renderLog(entries.reverse());
    });

    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
        if (e.target.id === 'modalOverlay') closeModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

/* ---------- rendering ---------- */

function renderGrid() {
    const grid = document.getElementById('lotGrid');
    grid.innerHTML = '';
    SPOT_IDS.forEach(id => {
        const spot = state.spots[id] || emptySpot();
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `spot ${spot.status}` + (spot.sessionId === mySessionId ? ' mine' : '');
        btn.innerHTML = `<span class="spot-code">${id}</span><span class="spot-status">${labelFor(spot)}</span>`;
        btn.addEventListener('click', () => openSpot(id));
        grid.appendChild(btn);
    });
}

function labelFor(spot) {
    if (spot.status === 'reserved') return spot.sessionId === mySessionId ? 'Reserved (you)' : 'Reserved';
    if (spot.status === 'occupied') return spot.sessionId === mySessionId ? 'Parked (you)' : 'Occupied';
    return 'Available';
}

function updateCounts() {
    const counts = { available: 0, reserved: 0, occupied: 0 };
    SPOT_IDS.forEach(id => {
        const spot = state.spots[id] || emptySpot();
        counts[spot.status] = (counts[spot.status] || 0) + 1;
    });
    setCount('countAvailable', counts.available, 'available');
    setCount('countReserved', counts.reserved, 'reserved');
    setCount('countOccupied', counts.occupied, 'occupied');
}

function setCount(elId, value, key) {
    const el = document.getElementById(elId);
    if (countCache[key] === value) return;
    countCache[key] = value;
    el.textContent = String(value).padStart(2, '0');
    el.classList.remove('flip');
    requestAnimationFrame(() => el.classList.add('flip'));
}

function renderLog(entries) {
    const wrap = document.getElementById('entryLog');
    if (!entries.length) {
        wrap.innerHTML = '<p class="log-empty" id="logEmpty">No activity yet.</p>';
        return;
    }
    wrap.innerHTML = entries.map(e => `
    <div class="log-entry">
      <span class="log-time">${formatTime(e.timestamp)}</span>
      <span>${escapeHtml(e.spot)}</span>
      <span class="log-event ${e.event}">${e.event.toUpperCase()}</span>
    </div>
  `).join('');
}

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(ms) {
    const mins = Math.max(0, Math.floor(ms / 60000));
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/* ---------- modal / booking flow ---------- */

function openSpot(id) {
    const spot = state.spots[id] || emptySpot();
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('ticketContent');
    const mine = spot.sessionId === mySessionId;

    if (spot.status === 'available') {
        const savedName = localStorage.getItem('parklive_name') || '';
        const savedVehicle = localStorage.getItem('parklive_vehicle') || '';
        content.innerHTML = `
      <h3 id="ticketTitle">Reserve spot</h3>
      <div class="ticket-spot-code">${id}</div>
      <div class="field"><label for="nameInput">Name</label><input id="nameInput" value="${escapeAttr(savedName)}" placeholder="Jordan Lee"></div>
      <div class="field"><label for="vehicleInput">Vehicle plate</label><input id="vehicleInput" value="${escapeAttr(savedVehicle)}" placeholder="KA 01 AB 1234"></div>
      <div class="ticket-actions">
        <button class="btn btn-primary" id="reserveBtn">Reserve spot</button>
      </div>
    `;
        overlay.classList.add('open');
        document.getElementById('reserveBtn').addEventListener('click', () => {
            const name = document.getElementById('nameInput').value.trim();
            const vehicle = document.getElementById('vehicleInput').value.trim();
            if (!name || !vehicle) { showToast('Add a name and plate to continue.'); return; }
            submitBooking(id, name, vehicle);
        });
        setTimeout(() => document.getElementById('nameInput').focus(), 0);

    } else if (spot.status === 'reserved' && mine) {
        content.innerHTML = `
      <h3 id="ticketTitle">Reservation</h3>
      <div class="ticket-spot-code">${id}</div>
      <p class="ticket-meta">${escapeHtml(spot.bookedBy)} · ${escapeHtml(spot.vehicle)}</p>
      <p class="ticket-meta">Reserved at ${formatTime(spot.reservedAt)}</p>
      <p class="ticket-note">Confirm entry once the vehicle is actually in the spot — that's the moment this logs an entry in real time.</p>
      <div class="ticket-actions">
        <button class="btn btn-primary" id="enterBtn">Confirm entry</button>
        <button class="btn btn-danger" id="cancelBtn">Cancel reservation</button>
      </div>
    `;
        overlay.classList.add('open');
        document.getElementById('enterBtn').addEventListener('click', () => checkIn(id));
        document.getElementById('cancelBtn').addEventListener('click', () => cancelReservation(id));

    } else if (spot.status === 'occupied' && mine) {
        const elapsed = formatElapsed(Date.now() - (spot.enteredAt || Date.now()));
        content.innerHTML = `
      <h3 id="ticketTitle">Currently parked</h3>
      <div class="ticket-spot-code">${id}</div>
      <p class="ticket-meta">${escapeHtml(spot.bookedBy)} · ${escapeHtml(spot.vehicle)}</p>
      <p class="ticket-meta">Parked for ${elapsed}</p>
      <div class="ticket-actions">
        <button class="btn btn-primary" id="exitBtn">Exit &amp; free spot</button>
      </div>
    `;
        overlay.classList.add('open');
        document.getElementById('exitBtn').addEventListener('click', () => checkOut(id));

    } else {
        const statusWord = spot.status === 'reserved' ? 'reserved' : 'occupied';
        content.innerHTML = `
      <h3 id="ticketTitle">Spot ${statusWord}</h3>
      <div class="ticket-spot-code">${id}</div>
      <p class="ticket-note">This bay is currently ${statusWord} by another driver.</p>
      <div class="ticket-actions">
        <button class="btn btn-secondary" id="okBtn">Close</button>
      </div>
    `;
        overlay.classList.add('open');
        document.getElementById('okBtn').addEventListener('click', closeModal);
    }
}

function submitBooking(id, name, vehicle) {
    localStorage.setItem('parklive_name', name);
    localStorage.setItem('parklive_vehicle', vehicle);

    // A transaction guarantees two people clicking the same open spot at the
    // same instant can't both win it — only the first write commits.
    firebase.database().ref('spots/' + id).transaction(current => {
        if (current === null || current.status === 'available') {
            return { status: 'reserved', bookedBy: name, vehicle, sessionId: mySessionId, reservedAt: Date.now(), enteredAt: null };
        }
        return; // abort, someone else already has it
    }, (error, committed) => {
        if (error) { showToast('Could not reserve — try again.'); return; }
        if (!committed) { showToast('That spot was just taken — pick another.'); closeModal(); return; }
        logEvent(id, 'booked', name, vehicle);
        showToast(`Spot ${id} reserved.`);
        closeModal();
    });
}

function checkIn(id) {
    const spot = state.spots[id];
    if (!spot || spot.sessionId !== mySessionId) return;
    firebase.database().ref('spots/' + id).update({ status: 'occupied', enteredAt: Date.now() });
    logEvent(id, 'entered', spot.bookedBy, spot.vehicle);
    showToast(`Entry logged for ${id}.`);
    closeModal();
}

function checkOut(id) {
    const spot = state.spots[id];
    if (!spot || spot.sessionId !== mySessionId) return;
    logEvent(id, 'exited', spot.bookedBy, spot.vehicle);
    firebase.database().ref('spots/' + id).set(emptySpot());
    showToast(`Spot ${id} is free again.`);
    closeModal();
}

function cancelReservation(id) {
    const spot = state.spots[id];
    if (!spot || spot.sessionId !== mySessionId) return;
    logEvent(id, 'cancelled', spot.bookedBy, spot.vehicle);
    firebase.database().ref('spots/' + id).set(emptySpot());
    showToast('Reservation cancelled.');
    closeModal();
}

function logEvent(spotId, event, name, vehicle) {
    firebase.database().ref('entryLog').push({
        spot: spotId, event, name: name || '', vehicle: vehicle || '', timestamp: Date.now()
    });
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

/* ---------- small helpers ---------- */

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }
