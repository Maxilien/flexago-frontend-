/* ============================================================
   GOOGLE MAPS — DISTANCE MATRIX (ADDRESS-BASED)
============================================================ */
async function computeMiles(pickupAddress, dropoffAddress) {
  return new Promise(resolve => {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [pickupAddress],
        destinations: [dropoffAddress],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL
      },
      (response, status) => {
        if (status !== "OK") {
          console.warn("DistanceMatrix failed:", status);
          return resolve(0);
        }

        const element = response.rows[0].elements[0];

        if (!element || element.status !== "OK") {
          return resolve(0);
        }

        const meters = element.distance.value;
        const miles = meters / 1609.34;

        resolve(miles);
      }
    );
  });
}

/* ============================================================
   AUTH GUARD — TRAVELER ONLY
   ============================================================ */

const user = JSON.parse(localStorage.getItem("user"));

// 1. Must be logged in
if (!user) {
  window.location.href = "login.html";
}

// 2. Must be a traveler
if (user.role !== "traveler") {
  window.location.href = "login.html";
}

// 3. Must have userId
window.userId = localStorage.getItem("userId");

if (!window.userId) {
  console.warn("No userId found — redirecting to login");
  window.location.href = "login.html";
}

// ⭐ REMOVE THIS (WRONG)
// window.travelerId = user._id;

// ⭐ ADD THIS (CORRECT)
loadTravelerIdentity();

/* ============================================================
   FLEXAGO TRAVELER — FINAL VERSION
   PART 1 — GLOBAL STATE • MAP • ROUTE • AUTOCOMPLETE • HELPERS
   ============================================================ */



/* ============================================================
   GLOBAL CONFIG
   ============================================================ */
// const BASE_URL = "https://flexago-backend.onrender.com";
// const WS_URL = "wss://flexago-backend.onrender.com";

// const socket = io(WS_URL, {
//   path: "/socket.io",
//   transports: ["websocket"]
// });

/* ============================================================
   GLOBAL CONFIG
   ============================================================ */

const BASE_URL = "https://flexago-backend.onrender.com";

const WS_URL =
  "wss://flexago-backend.onrender.com/ws";

// Socket.IO removed - using native WebSocket instead
/* ============================================================
   GLOBAL STATE (TRAVELER)
   ============================================================ */
let travelerMap = null;
let travelerDirections = null;
let travelerDirectionsRenderer = null;

let currentTravelerStart = null;
let currentTravelerDest = null;
let currentTravelerPolyline = [];

let ws = null;
let availableJobs = [];
let acceptedJobs = [];
let pickedUpJobs = [];   // ⭐ NEW — required for 4‑step workflow
let completedJobs = [];


let travelerRouteRadiusMiles = 5;
let travelerPickupMarker = null;
let travelerDropoffMarker = null;

/* ============================================================
   DARK MAP STYLE
   ============================================================ */
const FLEXAGO_DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a0f1f" }]
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }]
  }
];

/* ============================================================
   TRAVELER MAP INITIALIZATION
   ============================================================ */
function initTravelerMap() {
  const container = document.getElementById("travelerMap");
  if (!container || typeof google === "undefined" || !google.maps) return;

  travelerMap = new google.maps.Map(container, {
    center: { lat: 30.2672, lng: -97.7431 },
    zoom: 7,
    styles: FLEXAGO_DARK_STYLE,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  travelerDirections = new google.maps.DirectionsService();
  travelerDirectionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    preserveViewport: false,
    polylineOptions: {
      strokeColor: "#3b82f6",
      strokeOpacity: 0.9,
      strokeWeight: 5
    }
  });

  travelerDirectionsRenderer.setMap(travelerMap);
}

/* ============================================================
   TRAVELER ROUTE DRAWING
   ============================================================ */
function updateTravelerRoute() {
  if (!currentTravelerStart || !currentTravelerDest) return;

  travelerDirections.route(
    {
      origin: currentTravelerStart,
      destination: currentTravelerDest,
      travelMode: google.maps.TravelMode.DRIVING
    },
    (result, status) => {
      if (status !== "OK") return;

      travelerDirectionsRenderer.setDirections(result);

      const path = result.routes[0].overview_path;
      currentTravelerPolyline = path.map(p => [p.lng(), p.lat()]);
    }
  );
}
/* ============================================================
   AUTOCOMPLETE INIT (REQUIRED)
   ============================================================ */
function initTravelerAutocomplete() {
  initTravelerAutocompleteField("pickupInput", "start");
  initTravelerAutocompleteField("dropoffInput", "dest");
}

/* ============================================================
   AUTOCOMPLETE (2025+ API — FIXED)
   ============================================================ */
function initTravelerAutocompleteField(inputId, type) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["geometry", "formatted_address"],
    types: ["geocode"]
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();

    if (!place || !place.geometry) {
      console.warn("⚠ Autocomplete returned no geometry for:", inputId);
      return;
    }

    const coords = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    // ⭐ FIX: Write coordinates to global state + hidden inputs
    if (type === "start") {
      currentTravelerStart = coords;
      document.getElementById("pickup-lat").value = coords.lat;
      document.getElementById("pickup-lng").value = coords.lng;
      setTravelerMarker("pickup", coords);
    }

    if (type === "dest") {
      currentTravelerDest = coords;
      document.getElementById("dropoff-lat").value = coords.lat;
      document.getElementById("dropoff-lng").value = coords.lng;
      setTravelerMarker("dropoff", coords);
    }

    // ⭐ Now the route can draw correctly
    updateTravelerRoute();
  });
}

/* ============================================================
   ROUTE PLANNER INIT
   ============================================================ */
function initRoutePlanner() {
  initTravelerAutocomplete();

  const radiusSlider = document.getElementById("routeRadiusSlider");
  const radiusLabel = document.getElementById("routeRadiusLabel");

  if (radiusSlider) {
    travelerRouteRadiusMiles = Number(radiusSlider.value) || 5;
    if (radiusLabel) radiusLabel.textContent = `${travelerRouteRadiusMiles} mi`;

    radiusSlider.addEventListener("input", (e) => {
      travelerRouteRadiusMiles = Number(e.target.value) || 5;
      if (radiusLabel) radiusLabel.textContent = `${travelerRouteRadiusMiles} mi`;
      refreshJobs();
    });
  }
}
/* ============================================================
   HELPERS
   ============================================================ */
function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function safe(fn) {
  try { fn(); } catch (err) { console.warn("Flexago error:", err); }
}

async function getRealMiles(pickupAddress, dropoffAddress) {
  return new Promise((resolve) => {
    const service = new google.maps.DirectionsService();

    service.route(
      {
        origin: pickupAddress,
        destination: dropoffAddress,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          const meters = result.routes[0].legs[0].distance.value;
          resolve(meters * 0.000621371);
        } else {
          resolve(null);
        }
      }
    );
  });
}

/* ============================================================
   ACCEPT JOB (Traveler accepts delivery)
============================================================ */
async function acceptJob(jobId) {
  try {
    console.log("Traveler ID at accept:", window.userId);

    const res = await fetch(`${BASE_URL}/api/deliveries/${jobId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        travelerId: window.userId,
        travelerDetails: {
          firstName: window.userFirstName || "",
          lastName: window.userLastName || ""
        }
      })
    });

    const json = await res.json();

    if (!res.ok || json.success === false) {
      console.error("Accept failed:", json.error || json.message);
      alert("Failed to accept job");
      return;
    }

    // ⭐ ALWAYS use the backend job object (json.data)
    const job = json.data;

    // ⭐ Compute miles BEFORE inserting job into acceptedJobs
    const pickupAddress = job.pickupAddress || job.pickup?.address;
    const dropoffAddress = job.dropoffAddress || job.dropoff?.address;

    try {
      job.realMiles = await computeMiles(pickupAddress, dropoffAddress);
    } catch (mileErr) {
      console.error("Error computing miles:", mileErr);
      job.realMiles = 0; // fallback
    }

    // ⭐ Replace stale job with fresh backend job (with pickupCode + pickupVerified)
    const idx = acceptedJobs.findIndex(j => j._id === jobId);
    if (idx !== -1) {
      acceptedJobs[idx] = job;
    } else {
      acceptedJobs.push(job);
    }

    // ⭐ Remove job from available list
    availableJobs = availableJobs.filter(j => j._id !== jobId);

    closeJobDetailsModal();

    // ⭐ Refresh UI so pickupCode + pickupVerified appear
    refreshJobs();

  } catch (err) {
    console.error("Error accepting job:", err);
    alert("Error accepting job");
  }
}

async function declineJob(jobId) {
  try {
    const res = await fetch(`${BASE_URL}/api/deliveries/${jobId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
      console.error("Decline failed:", await res.text());
      return;
    }

    availableJobs = availableJobs.filter(j => j._id !== jobId);

    closeJobDetailsModal();
    refreshJobs();

  } catch (err) {
    console.error("Error declining job:", err);
  }
}

/* ============================================================
   VERIFY PICKUP (Traveler enters pickup code)
============================================================ */
async function verifyPickup(jobId) {
  try {
    // Ask traveler to enter the pickup code
    const code = prompt("Enter the pickup verification code:");

    if (!code) {
      alert("Pickup code is required.");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/deliveries/${jobId}/verifyPickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    const json = await res.json();

    if (!res.ok || json.success === false) {
      alert(json.error || "Invalid pickup code");
      return;
    }

    // Update local job state
    const updatedJob = json.data;

    // Replace the job in acceptedJobs
    const idx = acceptedJobs.findIndex(j => j._id === jobId);
    if (idx !== -1) {
      acceptedJobs[idx] = updatedJob;
    }

    alert("Pickup verified successfully!");
    refreshJobs();

  } catch (err) {
    console.error("Pickup verification error:", err);
    alert("Error verifying pickup");
  }
}

/* ============================================================
   JOB LOADING (FETCH ALL JOBS FOR THIS TRAVELER)
============================================================ */

async function loadJobs() {
  try {

    const res = await fetch(`${BASE_URL}/api/deliveries`);
    const json = await res.json();

    const all = json.data || [];

    const travelerIds = [
      String(window.userId || ""),
      String(window.travelerId || "")
    ];

    const belongsToTraveler = (job) => {
      const id = String(
        job.travelerId?._id ||
        job.travelerId ||
        job.traveler ||
        ""
      );

      return travelerIds.includes(id);
    };

    availableJobs = all.filter(
      j => j.status === "available"
    );

    acceptedJobs = all.filter(
      j =>
        j.status === "accepted" &&
        belongsToTraveler(j)
    );

    pickedUpJobs = all.filter(
      j =>
        (
          j.status === "picked_up" ||
          j.status === "in_transit"
        ) &&
        belongsToTraveler(j)
    );

    completedJobs = all.filter(
      j =>
        (
          j.status === "delivered" ||
          j.status === "payout_pending" ||
          j.status === "payout_completed"
        ) &&
        belongsToTraveler(j)
    );

    console.log("Traveler jobs loaded", {
      available: availableJobs.length,
      accepted: acceptedJobs.length,
      pickedUp: pickedUpJobs.length,
      completed: completedJobs.length
    });

    refreshJobs();
    refreshEarnings();

  } catch (err) {
    console.error(
      "Error loading jobs:",
      err
    );
  }
}
/* ============================================================
   MARKERS (CLEAN + FINAL)
   ============================================================ */
function setTravelerMarker(type, position) {
  if (!travelerMap) return;

  if (type === "pickup" && travelerPickupMarker) travelerPickupMarker.setMap(null);
  if (type === "dropoff" && travelerDropoffMarker) travelerDropoffMarker.setMap(null);

  const isPickup = type === "pickup";

  const marker = new google.maps.Marker({
    position,
    map: travelerMap,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: isPickup ? "#22c55e" : "#ef4444",
      fillOpacity: 1,
      strokeColor: isPickup ? "#166534" : "#7f1d1d",
      strokeWeight: 2
    }
  });

  if (isPickup) travelerPickupMarker = marker;
  else travelerDropoffMarker = marker;
}

/* ============================================================
   PAYOUT CALCULATION (UNIFIED + FINAL)
   ============================================================ */
function calculatePayout(job, miles) {
  const type = job.deliveryType || "local";
  const weight = job.package?.weight || 0;
  const insurance = job.package?.insurance || "waive";

  let base = 0;
  let perMile = 0;

  if (type === "local") {
    base = 5;
    perMile = 0.8;
  } else if (type === "nationwide") {
    base = 10;
    perMile = 1.2;
  } else if (type === "international") {
    return 200 * 0.8;
  }

  let price = base + (miles * perMile);
  price += weight * 0.25;

  if (insurance === "basic") price += 10;
  if (insurance === "premium") price += weight * 1.0;

  return price * 0.8;
}

/* ============================================================
   GOOGLE MAP CALLBACK (FINAL + CORRECT ORDER)
   ============================================================ */
window.initMap = function () {
  initTravelerMap();
  initTravelerAutocomplete();
  initJobSearch();        // must be before user clicks
  initRoutePlanner();     // safe to run last
};

/* ============================================================
   JOB FETCHING (CLEAN + GUARDED + OPTIMIZED)
============================================================ */

// Compute real driving miles using addresses (NOT lat/lng)
async function computeMiles(pickupAddress, dropoffAddress) {
  return new Promise(resolve => {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [pickupAddress],
        destinations: [dropoffAddress],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL
      },
      (response, status) => {
        if (status !== "OK") {
          console.warn("DistanceMatrix failed:", status);
          return resolve(0);
        }

        const element = response.rows[0].elements[0];

        if (!element || element.status !== "OK") {
          return resolve(0);
        }

        const meters = element.distance.value;
        const miles = meters / 1609.34;

        resolve(miles);
      }
    );
  });
}

let isSearching = false;

// Load available jobs
async function loadAvailableJobs() {
  if (isSearching) return;
  isSearching = true;

  try {
    if (!currentTravelerStart || !currentTravelerDest) {
      console.warn("Missing start or destination");
      return;
    }

    const payload = {
      start: {
        lng: Number(currentTravelerStart.lng),
        lat: Number(currentTravelerStart.lat)
      },
      destination: {
        lng: Number(currentTravelerDest.lng),
        lat: Number(currentTravelerDest.lat)
      },
      route: Array.isArray(currentTravelerPolyline)
        ? currentTravelerPolyline
        : [],
      maxMiles: 999999
    };

    const res = await fetch(`${BASE_URL}/api/deliveries/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error("Job search failed:", res.status);
      return;
    }

    const data = await res.json();
    availableJobs = Array.isArray(data.data) ? data.data : [];

    // Enrich jobs with real miles + payout
    await Promise.all(
      availableJobs.map(async (job) => {
        const pickupAddress = job.pickupAddress || job.pickup?.address;
        const dropoffAddress = job.dropoffAddress || job.dropoff?.address;

        job.realMiles = await computeMiles(pickupAddress, dropoffAddress);
        job.payoutAmount = job.payoutAmount ?? job.payout ?? job.price ?? 0;
      })
    );

    refreshJobs();
    refreshEarnings();

  } catch (err) {
    console.error("Error loading jobs:", err);
  } finally {
    isSearching = false;
  }
}

/* ============================================================
   ROUTE MATCHING (PLACEHOLDER)
============================================================ */

function isJobOnRoute(job) {
  return true;
}

/* ============================================================
   REFRESH JOB LISTS (CLEAN + FINAL)
   ============================================================ */
function refreshJobs() {
  const availableList = document.getElementById("jobsAvailableList");
  const acceptedList = document.getElementById("jobsAcceptedList");
  const pickedUpList = document.getElementById("jobsPickedUpList");   // ⭐ NEW
  const completedList = document.getElementById("jobsCompletedList");

  if (availableList) availableList.innerHTML = "";
  if (acceptedList) acceptedList.innerHTML = "";
  if (pickedUpList) pickedUpList.innerHTML = "";                      // ⭐ NEW
  if (completedList) completedList.innerHTML = "";

  if (availableList) {
    const sorted = [...availableJobs]
      .map(job => ({ ...job, onRoute: isJobOnRoute(job) }))
      .sort((a, b) => {
        if (a.onRoute && !b.onRoute) return -1;
        if (!a.onRoute && b.onRoute) return 1;
        return 0;
      });

    sorted.forEach(job => renderJobCard(job, "available", availableList));
  }

  if (acceptedList) {
    acceptedJobs.forEach(job => renderJobCard(job, "accepted", acceptedList));
  }

  if (pickedUpList) {                                                 // ⭐ NEW
    pickedUpJobs.forEach(job => renderJobCard(job, "picked_up", pickedUpList));
  }

  if (completedList) {
    completedJobs.forEach(job => renderJobCard(job, "completed", completedList));
  }
}

/* ============================================================
   EARNINGS SUMMARY
============================================================ */
function refreshEarnings() {
  const todayEl = document.getElementById("todayEarnings");
  const weekEl = document.getElementById("weekEarnings");
  const pendingEl = document.getElementById("pendingPayout");
  const pipelineEl = document.getElementById("pipelineValue");
  const completedEl = document.getElementById("completedCount");

  if (
    !todayEl ||
    !weekEl ||
    !pendingEl ||
    !pipelineEl ||
    !completedEl
  ) {
    return;
  }

  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(
    startOfWeek.getDate() - startOfWeek.getDay()
  );

  let todayTotal = 0;
  let weekTotal = 0;
  let pendingTotal = 0;
  let pipelineTotal = 0;
  let completedCount = 0;

  const allJobs = [
    ...(completedJobs || []),
    ...(acceptedJobs || []),
    ...(pickedUpJobs || [])
  ];

  allJobs.forEach(job => {
    const payout = Number(
      job.payoutAmount ||
      job.payout ||
      0
    );

    if (isNaN(payout)) {
      return;
    }

    const completedDate = new Date(
      job.payoutCompletedAt ||
      job.completedAt ||
      job.deliveredAt ||
      job.updatedAt ||
      job.createdAt
    );

    if (
  job.status === "payout_completed" ||
  job.status === "payout_pending"
) {
  completedCount++;

  if (
    completedDate >= startOfToday
  ) {
    todayTotal += payout;
  }

  if (
    completedDate >= startOfWeek
  ) {
    weekTotal += payout;
  }
}

if (
  job.status === "payout_pending"
) {
  pendingTotal += payout;
}
    if (
      job.status === "accepted" ||
      job.status === "in_transit" ||
      job.status === "picked_up"
    ) {
      pipelineTotal += payout;
    }
  });

  todayEl.textContent =
    `$${todayTotal.toFixed(2)}`;

  weekEl.textContent =
    `$${weekTotal.toFixed(2)}`;

  pendingEl.textContent =
    `$${pendingTotal.toFixed(2)}`;

  pipelineEl.textContent =
    `$${pipelineTotal.toFixed(2)}`;

  completedEl.textContent =
    completedCount;
}
/* ============================================================
   SIGNATURE PAD SETUP
============================================================ */
let signaturePadCanvas = null;

function initSignaturePad() {
  const canvas = document.getElementById("signatureCanvas");
  if (!canvas) return;

  signaturePadCanvas = canvas;
  const ctx = canvas.getContext("2d");

  let drawing = false;

  canvas.addEventListener("mousedown", () => { drawing = true; });
  canvas.addEventListener("mouseup", () => { drawing = false; ctx.beginPath(); });
  canvas.addEventListener("mousemove", draw);

  function draw(e) {
    if (!drawing) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  }
}

/* ============================================================
   PHOTO PREVIEW
============================================================ */
document.getElementById("deliveryPhotoInput")?.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.querySelector(".delivery-photo-preview");
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

/* ============================================================
   COMPLETE JOB — SEND FORM DATA (photo + signature + name)
============================================================ */
async function completeJob(jobId) {
  const modal = document.getElementById("proofOfDeliveryModal");

  const signedBy = modal.querySelector(".receiverNameInput").value.trim();
  const photoFile = document.getElementById("deliveryPhotoInput").files[0];

  // Convert signature canvas to Blob
  const canvas = document.getElementById("signatureCanvas");
  const signatureBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

if (!signedBy) {
  alert("Please enter who signed for the delivery.");
  return;
}

  if (!photoFile) {
    alert("Please upload a delivery photo.");
    return;
  }

  if (!signatureBlob) {
    alert("Please provide a signature.");
    return;
  }

  // ⭐ Build FormData for multer
  const formData = new FormData();
  formData.append("signedBy", signedBy);
  formData.append("photo", photoFile);
  formData.append("signature", signatureBlob, "signature.png");

  try {
    const res = await fetch(`${BACKEND_URL}/deliveries/${jobId}/complete`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      alert("Delivery completed successfully!");
      modal.classList.add("hidden");
      loadTravelerJobs(); // Refresh list
    } else {
      alert("Error completing delivery: " + data.error);
    }
  } catch (err) {
    console.error("Complete Job Error:", err);
    alert("Server error completing delivery.");
  }
}

/* ============================================================
   OPEN PROOF OF DELIVERY MODAL
============================================================ */
function openProofOfDeliveryModal(job) {
  const modal = document.getElementById("proofOfDeliveryModal");
  if (!modal) return;

  modal.classList.remove("hidden");

  // Reset fields
  modal.querySelector(".receiverNameInput").value = "";
  modal.querySelector(".delivery-photo-preview").style.display = "none";
  modal.querySelector(".delivery-photo-preview").src = "";

  // Reset signature pad
  const canvas = document.getElementById("signatureCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  initSignaturePad();

  modal.querySelector(".complete-delivery-btn").onclick = () => {
    completeJob(job._id);
  };
}

/* ============================================================
   JOB CARD RENDERING — TRAVELER VERSION (FINAL UPDATED)
============================================================ */
function renderJobCard(job, status, listElement) {
  if (!listElement) return;

  console.log("JOB OBJECT:", job);

  const card = document.createElement("div");
  card.className = "job-card";

  /* ============================================================
     DELIVERY ID
  ============================================================ */
  const deliveryId =
    job.deliveryId ||
    job.delivery?._id ||
    job.id ||
    job._id;

  /* ============================================================
     MILES — PRECOMPUTED BEFORE RENDER
     (NEVER async here — prevents map break)
  ============================================================ */
  const milesDisplay = Number(job.realMiles || 0).toFixed(1);

  /* ============================================================
     PAYOUT — EXACT VALUE FROM SENDER
  ============================================================ */
  const payout =
    job.payoutAmount ??
    job.payout ??
    job.price ??
    0;

  const payoutDisplay = Number(payout).toFixed(2);

  /* ============================================================
     BADGE COLOR
  ============================================================ */
  const badgeColor =
    job.realMiles < 10 ? "green" :
    job.realMiles < 50 ? "orange" :
    "red";

/* ============================================================
   CARD HTML
============================================================ */

card.innerHTML = `
  <div class="job-header">
    <span class="badge badge-${badgeColor}">
      ${milesDisplay} mi
    </span>

    <button
      class="details-btn"
      data-id="${deliveryId}"
    >
      View Details
    </button>
  </div>

  <div class="job-row">
    <div class="job-label">
      <span class="icon-pin pickup"></span>
      Pickup:
    </div>

    <div class="job-value">
      ${job.pickupAddress || job.pickup?.address || "—"}
    </div>
  </div>

  <div class="job-row">
    <div class="job-label">
      <span class="icon-pin dropoff"></span>
      Dropoff:
    </div>

    <div class="job-value">
      ${job.dropoffAddress || job.dropoff?.address || "—"}
    </div>
  </div>

  <div class="job-row">
    <div class="job-label">
      <span class="icon-money"></span>
      Payout:
    </div>

    <div class="job-value">
      $${payoutDisplay}
    </div>
  </div>

  <div class="job-actions">

    ${status === "available" ? `
      <button
        class="primary-btn accept-btn"
        data-id="${deliveryId}"
      >
        Accept
      </button>

      <button
        class="secondary-btn decline-btn"
        data-id="${deliveryId}"
      >
        Decline
      </button>
    ` : ""}

    ${status === "accepted" ? `
      <div class="action-row">

        <!-- DELIVERY CHAT -->
        <button
          type="button"
          class="delivery-chat-btn"
          data-id="${deliveryId}"
          title="Chat with Sender"
          aria-label="Chat with Sender"
        >
          <i data-lucide="message-circle"></i>
          <span>Chat</span>
        </button>

        <!-- VERIFY PICKUP CODE -->
        <button
          class="primary-btn verify-pickup-btn"
          data-id="${deliveryId}"
        >
          Verify Pickup Code
        </button>

        <!-- PICK UP: HIDDEN UNTIL VERIFIED -->
        <button
          class="primary-btn pickup-btn hidden"
          data-id="${deliveryId}"
        >
          Pick Up
        </button>

      </div>
    ` : ""}

    ${status === "picked_up" ? `
      <div class="action-row">

        <!-- DELIVERY CHAT -->
        <button
          type="button"
          class="delivery-chat-btn"
          data-id="${deliveryId}"
          title="Chat with Sender"
          aria-label="Chat with Sender"
        >
          <i data-lucide="message-circle"></i>
          <span>Chat</span>
        </button>

        <!-- PROOF OF DELIVERY -->
        <button
          class="primary-btn proof-btn"
          data-id="${deliveryId}"
        >
          Proof of Delivery
        </button>

        <!-- COMPLETE DELIVERY -->
        <button
          class="primary-btn complete-delivery-btn"
          data-id="${deliveryId}"
        >
          Complete Delivery
        </button>

        <!-- DELIVERED: HIDDEN UNTIL PROOF + SIGNATURE -->
        <button
          class="primary-btn delivered-btn hidden"
          data-id="${deliveryId}"
        >
          Delivered
        </button>

      </div>
    ` : ""}

    ${status === "completed" ? `
      <div class="completed-tag">
        Completed
      </div>
    ` : ""}

  </div>

  <div class="delivery-photo-section hidden">
    <label class="form-label">
      Signed By
    </label>

    <input
      type="text"
      id="receiverNameInput"
      class="input-shell"
      placeholder="Who signed for the delivery?"
    />

    <button
      class="primary-btn delivered-btn"
      style="margin-top:0.8rem;"
    >
      Delivered
    </button>
  </div>
`;

listElement.appendChild(card);
  /* ============================================================
     STATUS HANDLERS
============================================================ */

  if (status === "available") {
    card.querySelector(".accept-btn").addEventListener("click", () => acceptJob(deliveryId));
    card.querySelector(".decline-btn").addEventListener("click", () => declineJob(deliveryId));
  }

if (status === "accepted") {

  const verifyBtn = card.querySelector(".verify-pickup-btn");
  const pickupBtn = card.querySelector(".pickup-btn");

  // Show correct buttons
  if (!job.pickupVerified) {
    verifyBtn.classList.remove("hidden");
    pickupBtn.classList.add("hidden");
  } else {
    verifyBtn.classList.add("hidden");
    pickupBtn.classList.remove("hidden");
  }

  // ⭐ Wire verify button
  verifyBtn.addEventListener("click", () => verifyPickup(deliveryId));

  // ⭐ Wire pick up button
  pickupBtn.addEventListener("click", () => pickupJob(deliveryId));
}


  if (status === "picked_up") {

    // ⭐ PROOF OF DELIVERY BUTTON
    const proofBtn = card.querySelector(".proof-btn");
    proofBtn.addEventListener("click", () => openProofOfDeliveryModal(job));

    // ⭐ COMPLETE DELIVERY BUTTON
    const completeDeliveryBtn = card.querySelector(".complete-delivery-btn");
    completeDeliveryBtn.addEventListener("click", () => {
      openTravelerDetails(job);
      const proofSection = document.querySelector(".delivery-photo-section");
      if (proofSection) proofSection.classList.remove("hidden");
    });

    // ⭐ DELIVERED BUTTON
    const deliveredBtn = card.querySelector(".delivered-btn");
    deliveredBtn.addEventListener("click", () => completeJob(deliveryId));
  }
/* ============================================================
     VIEW DETAILS — CORRECT BEHAVIOR FOR EACH STATUS
============================================================ */
const detailsBtn = card.querySelector(".details-btn");

if (status === "available") {
  detailsBtn.addEventListener("click", () => openJobDetailsModal(job));
}

else if (status === "accepted") {
  detailsBtn.addEventListener("click", () => openJobDetailsModal(job));
}

else if (status === "picked_up") {
  detailsBtn.addEventListener("click", () => {
    openTravelerDetails(job);

    const proofSection = document.querySelector(".delivery-photo-section");
    if (proofSection) proofSection.classList.remove("hidden");
  });
}

else if (status === "completed") {
  detailsBtn.addEventListener("click", () => openTravelerDetails(job));
}
}
/* ============================================================
   OPEN PROOF OF DELIVERY MODAL
============================================================ */
function openProofOfDeliveryModal(job) {
  const modal = document.getElementById("proofOfDeliveryModal");
  if (!modal) return;

  // ── Reset Signed By ──────────────────────────────────────
  const signedByInput = modal.querySelector(".signed-by-input");
  if (signedByInput) signedByInput.value = "";

  // ── Reset Photo ──────────────────────────────────────────
  const photoInput   = modal.querySelector(".delivery-photo-input");
  const photoPreview = modal.querySelector(".delivery-photo-preview");
  if (photoInput)   photoInput.value = "";
  if (photoPreview) { photoPreview.src = ""; photoPreview.style.display = "none"; }

  // ── Photo preview on file select ─────────────────────────
  if (photoInput) {
    photoInput.onchange = () => {
      const file = photoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        photoPreview.src = e.target.result;
        photoPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    };
  }

  // ── Signature Pad (mouse + touch) ────────────────────────
  const canvas = modal.querySelector(".signature-pad");
  if (canvas) {
    // Clone to remove any previously attached listeners
    const fresh = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(fresh, canvas);

    const ctx = fresh.getContext("2d");
    ctx.strokeStyle = "#000";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.clearRect(0, 0, fresh.width, fresh.height);

    let isDrawing = false;

    function getPos(e) {
      const rect = fresh.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    }
    function startDraw(e) {
      e.preventDefault();
      isDrawing = true;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    function stopDraw() { isDrawing = false; }

    fresh.addEventListener("mousedown",  startDraw);
    fresh.addEventListener("mousemove",  draw);
    fresh.addEventListener("mouseup",    stopDraw);
    fresh.addEventListener("mouseleave", stopDraw);
    fresh.addEventListener("touchstart", startDraw, { passive: false });
    fresh.addEventListener("touchmove",  draw,       { passive: false });
    fresh.addEventListener("touchend",   stopDraw);

    // Clear button
    const clearBtn = modal.querySelector(".clear-signature-btn");
    if (clearBtn) clearBtn.onclick = () => ctx.clearRect(0, 0, fresh.width, fresh.height);
  }

  // ── Wire Complete Delivery button ────────────────────────
  const submitBtn = modal.querySelector(".complete-delivery-btn");
  if (submitBtn) {
    submitBtn.onclick = () => completeJob(job._id);
  }

  // ── Show modal ───────────────────────────────────────────
  modal.classList.remove("hidden");
}

/* ============================================================
   OPEN TRAVELER DETAILS PANEL
   ============================================================ */
function openTravelerDetails(job) {
  const panel = document.querySelector(".accepted-expanded");
  if (!panel) {
    console.error("accepted-expanded panel not found in DOM");
    return;
  }

  panel.classList.remove("hidden");

  const safe = (value) => value ?? "—";

  // SENDER DETAILS
  panel.querySelector(".sender-name").textContent = safe(job.senderName || job.sender?.name);
  panel.querySelector(".sender-phone").textContent = safe(job.senderPhone || job.sender?.phone);
  panel.querySelector(".sender-email").textContent = safe(job.senderEmail || job.sender?.email);
  panel.querySelector(".sender-instructions").textContent = safe(job.pickupInstructions || job.sender?.instructions);

  // RECEIVER DETAILS
  panel.querySelector(".receiver-name").textContent = safe(job.receiverName || job.receiver?.name);
  panel.querySelector(".receiver-phone").textContent = safe(job.receiverPhone || job.receiver?.phone);
  panel.querySelector(".receiver-email").textContent = safe(job.receiverEmail || job.receiver?.email);
  panel.querySelector(".receiver-instructions").textContent = safe(job.dropoffInstructions || job.receiver?.instructions);

  // ITEM DETAILS
  panel.querySelector(".item-description").textContent = safe(job.package?.description);
  panel.querySelector(".item-size").textContent = safe(job.package?.size);
  panel.querySelector(".item-weight").textContent = safe(job.package?.weight);
  panel.querySelector(".item-fragility").textContent = safe(job.package?.fragility);
// ============================================================
// PICKUP SECURITY — SHOW CODE + VERIFIED STATUS
// ============================================================
const codeSection = panel.querySelector(".pickup-code-section");
const codeValue = panel.querySelector(".pickup-code-value");
const codeVerified = panel.querySelector(".pickup-code-verified");

if (codeSection) {
  // Show the pickup code
  codeValue.textContent = job.pickupCode || "—";

  // Show verified status
  if (job.pickupVerified) {
    codeVerified.textContent = "✔ Code Verified";
    codeVerified.style.color = "green";
    codeVerified.classList.remove("hidden");
  } else {
    codeVerified.textContent = "Not Verified";
    codeVerified.style.color = "red";
    codeVerified.classList.remove("hidden");
  }

  codeSection.classList.remove("hidden");
}

  // Photo
  const photo = panel.querySelector(".item-photo");
  if (job.package?.photoUrl) {
    photo.src = job.package.photoUrl;
    photo.style.display = "block";
  } else {
    photo.style.display = "none";
  }

  // STATUS BUTTONS
  panel.querySelector(".verify-code-btn").onclick = () => verifyPickup(job._id);
  panel.querySelector(".pickup-btn").onclick = () => pickupJob(job._id);
  panel.querySelector(".dropoff-btn").onclick = () => onMyWayDropoff(job._id);
  panel.querySelector(".delivered-btn").onclick = () => completeJob(job._id);

  // BUTTON VISIBILITY LOGIC
  const verifyBtn = panel.querySelector(".verify-code-btn");
  const pickupBtn = panel.querySelector(".pickup-btn");

  if (!job.pickupVerified) {
    verifyBtn.classList.remove("hidden");
    pickupBtn.classList.add("hidden");
  } else {
    verifyBtn.classList.add("hidden");
    pickupBtn.classList.remove("hidden");
  }
}

/* ============================================================
   OPEN JOB DETAILS MODAL (AVAILABLE JOBS)
   ============================================================ */
function openJobDetailsModal(job) {
  const modal = document.getElementById("jobDetailsModal");

  modal.querySelector(".pickup").textContent = job.pickupAddress || job.pickup?.address || "—";
  modal.querySelector(".dropoff").textContent = job.dropoffAddress || job.dropoff?.address || "—";
  modal.querySelector(".travelType").textContent = job.travelType || "Standard";
  modal.querySelector(".miles").textContent = job.realMiles || job.distanceMiles || job.distance || "—";
  modal.querySelector(".payout").textContent = `$${Number(job.payout).toFixed(2)}`;

  modal.querySelector(".senderName").textContent = job.sender?.name || "—";
  modal.querySelector(".senderPhone").textContent = job.sender?.phone || "—";

  modal.querySelector(".receiverName").textContent = job.receiver?.name || "—";
  modal.querySelector(".receiverPhone").textContent = job.receiver?.phone || "—";

  modal.querySelector(".itemDescription").textContent = job.package?.description || "—";
  modal.querySelector(".itemSize").textContent = job.package?.size || "—";
  modal.querySelector(".itemWeight").textContent = job.package?.weight || "—";

  const photo = modal.querySelector(".itemPhoto");
  if (job.package?.photoUrl) {
    photo.src = job.package.photoUrl;
    photo.style.display = "block";
  } else {
    photo.style.display = "none";
  }

  // ⭐ NEW: Proof of Delivery Section
  const signedBySpan = modal.querySelector(".signedBy");
  const signedPhoto = modal.querySelector(".signedPhoto");
  const signedSignature = modal.querySelector(".signedSignature");

  if (job.proofOfDelivery) {
    signedBySpan.textContent = job.proofOfDelivery.signedBy || "—";

    if (job.proofOfDelivery.photoUrl) {
      signedPhoto.src = job.proofOfDelivery.photoUrl;
      signedPhoto.style.display = "block";
    } else {
      signedPhoto.style.display = "none";
    }

    if (job.proofOfDelivery.signatureUrl) {
      signedSignature.src = job.proofOfDelivery.signatureUrl;
      signedSignature.style.display = "block";
    } else {
      signedSignature.style.display = "none";
    }
  } else {
    signedBySpan.textContent = "—";
    signedPhoto.style.display = "none";
    signedSignature.style.display = "none";
  }

  modal.classList.remove("hidden");
}

/* ============================================================
   PICKUP JOB (UPDATED FOR 4‑STEP WORKFLOW)
   ============================================================ */
async function pickupJob(jobId) {
  try {
    const res = await fetch(`${BASE_URL}/api/deliveries/${jobId}/pickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ travelerId: window.travelerId })
    });

    const json = await res.json();

    if (!json.success) {
      alert("Pickup failed: " + json.error);
      return;
    }

    // ⭐ MOVE JOB FROM ACCEPTED → PICKED UP
    pickedUpJobs.push(json.data);
    acceptedJobs = acceptedJobs.filter(j => j._id !== jobId);

    refreshJobs();   // ⭐ instant UI update

  } catch (err) {
    console.error("Pickup error:", err);
  }
}

/* ============================================================
   COMPLETE JOB (FINAL VERSION — signedBy + photo + signature)
   ============================================================ */
async function completeJob(deliveryId) {
  try {
    console.log("Completing job:", deliveryId);

    const modal = document.getElementById("proofOfDeliveryModal");

    // 1️⃣ Signed By
    const signedByInput = modal.querySelector(".signed-by-input");
    const signedBy = signedByInput ? signedByInput.value.trim() : "";

    // 2️⃣ Delivery Photo
    const photoInput = modal.querySelector(".delivery-photo-input");
    const photoFile = photoInput && photoInput.files.length > 0
      ? photoInput.files[0]
      : null;

    // 3️⃣ Signature Canvas → Blob
    const signatureCanvas = modal.querySelector(".signature-pad");
    let signatureBlob = null;

    if (signatureCanvas) {
      const dataURL = signatureCanvas.toDataURL("image/png");
      const byteString = atob(dataURL.split(",")[1]);
      const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];

      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      signatureBlob = new Blob([ab], { type: mimeString });
    }

    // 4️⃣ Build FormData
    const formData = new FormData();
    formData.append("signedBy", signedBy);

    if (photoFile) {
      formData.append("photo", photoFile);
    }

    if (signatureBlob) {
      formData.append("signature", signatureBlob, "signature.png");
    }

    // 5️⃣ Send to backend (multipart/form-data)
    const response = await fetch(
      `https://flexago-backend.onrender.com/api/deliveries/${deliveryId}/complete`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error("Failed to complete job");
    }

    const updatedJob = await response.json();
    console.log("Job completed:", updatedJob);

    // Refresh job lists
    loadJobs();

  } catch (err) {
    console.error("Error completing job:", err);
    alert("Could not complete delivery.");
  }
}

// ============================================================
// REAL-TIME DELIVERY AND CHAT WEBSOCKET
// ============================================================

let wsUpdateTimeout = null;
let wsReconnectTimeout = null;
let activeSocketDeliveryId = null;
let activeSocketChatDeliveryId = null;
let shouldReconnectTravelerSocket = true;

// ============================================================
// SEND WEBSOCKET PAYLOAD
// ============================================================

function sendTravelerSocketPayload(payload) {
  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN
  ) {
    return false;
  }

  ws.send(
    JSON.stringify(payload)
  );

  return true;
}

// ============================================================
// JOIN STANDARD DELIVERY ROOM
// ============================================================

function joinTravelerDeliveryRoom(deliveryId) {
  if (!deliveryId) {
    return false;
  }

  activeSocketDeliveryId =
    String(deliveryId);

  return sendTravelerSocketPayload({
    type: "joinDelivery",
    deliveryId: activeSocketDeliveryId
  });
}

// ============================================================
// JOIN AUTHORIZED DELIVERY CHAT ROOM
// ============================================================

function joinTravelerDeliveryChat(deliveryId) {
  if (!deliveryId) {
    return false;
  }

  const travelerUserId = String(
    window.userId ||
    localStorage.getItem("userId") ||
    ""
  ).trim();

  if (!travelerUserId) {
    console.warn(
      "Unable to join delivery chat without a Traveler user ID."
    );

    return false;
  }

  activeSocketChatDeliveryId =
    String(deliveryId);

  return sendTravelerSocketPayload({
    type: "joinDeliveryChat",
    deliveryId: activeSocketChatDeliveryId,
    userId: travelerUserId,
    userRole: "traveler"
  });
}

// ============================================================
// BROADCAST SAVED DELIVERY MESSAGE
// ============================================================

function broadcastTravelerDeliveryMessage(
  deliveryId,
  messageId
) {
  if (!deliveryId || !messageId) {
    return false;
  }

  return sendTravelerSocketPayload({
    type: "delivery_chat_message",
    deliveryId: String(deliveryId),
    messageId: String(messageId)
  });
}

// ============================================================
// BROADCAST DELIVERY CHAT READ STATUS
// ============================================================

function broadcastTravelerChatRead(deliveryId) {
  if (!deliveryId) {
    return false;
  }

  return sendTravelerSocketPayload({
    type: "delivery_chat_read",
    deliveryId: String(deliveryId)
  });
}

// ============================================================
// HANDLE WEBSOCKET MESSAGE
// ============================================================

function handleTravelerSocketMessage(event) {
  try {
    const message = JSON.parse(
      event.data
    );

    console.log(
      "Traveler WebSocket message:",
      message
    );

    // Existing delivery/job updates
    if (
      message.type === "job_update" ||
      message.type === "job_completed" ||
      message.type === "new_job" ||
      message.type === "status_update" ||
      message.type === "traveler_assigned"
    ) {
      clearTimeout(
        wsUpdateTimeout
      );

      wsUpdateTimeout = setTimeout(
        () => {
          if (!isSearching) {
            loadAvailableJobs();
          }
        },
        300
      );
    }

    // Delivery chat room authorization result
    if (
      message.type ===
      "delivery_chat_joined"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "flexago:delivery-chat-joined",
          {
            detail: message
          }
        )
      );

      return;
    }

    // New real-time delivery message
    if (
      message.type ===
      "delivery_chat_message"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "flexago:delivery-chat-message",
          {
            detail: message
          }
        )
      );

      return;
    }

    // Read receipt
    if (
      message.type ===
      "delivery_chat_read"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "flexago:delivery-chat-read",
          {
            detail: message
          }
        )
      );

      return;
    }

    // Socket-level error
    if (
      message.type === "socket_error"
    ) {
      console.error(
        "Delivery chat socket error:",
        message.error
      );

      window.dispatchEvent(
        new CustomEvent(
          "flexago:delivery-chat-error",
          {
            detail: message
          }
        )
      );
    }

  } catch (error) {
    console.error(
      "Traveler WebSocket message error:",
      error
    );
  }
}

// ============================================================
// CONNECT TRAVELER WEBSOCKET
// ============================================================

function connectTravelerSocket() {
  if (
    ws &&
    (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    )
  ) {
    return ws;
  }

  clearTimeout(
    wsReconnectTimeout
  );

  try {
    ws = new WebSocket(
      WS_URL
    );

    ws.addEventListener(
      "open",
      () => {
        console.log(
          "Traveler WebSocket connected."
        );

        if (
          activeSocketDeliveryId
        ) {
          joinTravelerDeliveryRoom(
            activeSocketDeliveryId
          );
        }

        if (
          activeSocketChatDeliveryId
        ) {
          joinTravelerDeliveryChat(
            activeSocketChatDeliveryId
          );
        }
      }
    );

    ws.addEventListener(
      "message",
      handleTravelerSocketMessage
    );

    ws.addEventListener(
      "error",
      (error) => {
        console.error(
          "Traveler WebSocket error:",
          error
        );
      }
    );

    ws.addEventListener(
      "close",
      () => {
        console.warn(
          "Traveler WebSocket disconnected."
        );

        ws = null;

        if (
          shouldReconnectTravelerSocket
        ) {
          wsReconnectTimeout =
            setTimeout(
              connectTravelerSocket,
              3000
            );
        }
      }
    );

  } catch (error) {
    console.error(
      "Unable to initialize Traveler WebSocket:",
      error
    );
  }

  return ws;
}

// ============================================================
// INITIALIZE OR REJOIN DELIVERY SOCKET
// ============================================================

function initJobSocket(deliveryId) {
  if (deliveryId) {
    activeSocketDeliveryId =
      String(deliveryId);
  }

  connectTravelerSocket();

  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    activeSocketDeliveryId
  ) {
    joinTravelerDeliveryRoom(
      activeSocketDeliveryId
    );
  }
}

// ============================================================
// CLOSE SOCKET WHEN LEAVING PAGE
// ============================================================

window.addEventListener(
  "beforeunload",
  () => {
    shouldReconnectTravelerSocket =
      false;

    clearTimeout(
      wsReconnectTimeout
    );

    if (
      ws &&
      (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      )
    ) {
      ws.close();
    }
  }
);
// ============================================================
// DELIVERY CHAT PANEL
// Traveler to Sender
//
// Includes:
// - Open and close behavior
// - Persisted message history
// - Message sending
// - WebSocket room authorization
// - Real-time incoming messages
// - Duplicate-message prevention
// - Read-status updates
// ============================================================

let activeDeliveryChatId = null;

function initDeliveryChatPanel() {
  const panel = document.getElementById(
    "deliveryChatPanel"
  );

  const closeBtn = document.getElementById(
    "deliveryChatCloseBtn"
  );

  const messagesContainer = document.getElementById(
    "deliveryChatMessages"
  );

  const statusElement = document.getElementById(
    "deliveryChatStatus"
  );

  const input = document.getElementById(
    "deliveryChatInput"
  );

  const sendBtn = document.getElementById(
    "deliveryChatSendBtn"
  );

  if (
    !panel ||
    !closeBtn ||
    !messagesContainer ||
    !statusElement ||
    !input ||
    !sendBtn
  ) {
    console.warn(
      "Delivery chat panel elements were not found."
    );

    return;
  }

  let deliveryChatSending = false;

  // ==========================================================
  // GET LOGGED-IN TRAVELER USER ID
  // ==========================================================

  function getTravelerChatUserId() {
    return String(
      window.userId ||
      localStorage.getItem("userId") ||
      ""
    ).trim();
  }

  // ==========================================================
  // CLEAR MESSAGE CONTAINER
  // ==========================================================

  function clearMessages() {
    messagesContainer.innerHTML = "";
  }

  // ==========================================================
  // REMOVE EMPTY OR LOADING STATE
  // ==========================================================

  function removeConversationState() {
    const stateElements =
      messagesContainer.querySelectorAll(
        ".delivery-chat-empty"
      );

    stateElements.forEach((element) => {
      element.remove();
    });
  }

  // ==========================================================
  // SHOW EMPTY CONVERSATION
  // ==========================================================

  function showEmptyConversation() {
    clearMessages();

    const emptyState =
      document.createElement("div");

    emptyState.className =
      "delivery-chat-empty";

    emptyState.textContent =
      "No messages yet. Start the conversation with the Sender.";

    messagesContainer.appendChild(
      emptyState
    );
  }

  // ==========================================================
  // SHOW LOADING CONVERSATION
  // ==========================================================

  function showLoadingConversation() {
    clearMessages();

    const loadingState =
      document.createElement("div");

    loadingState.className =
      "delivery-chat-empty";

    loadingState.textContent =
      "Loading conversation...";

    messagesContainer.appendChild(
      loadingState
    );
  }

  // ==========================================================
  // SHOW CONVERSATION ERROR
  // ==========================================================

  function showConversationError(message) {
    clearMessages();

    const errorState =
      document.createElement("div");

    errorState.className =
      "delivery-chat-empty";

    errorState.textContent =
      message ||
      "Unable to load the conversation.";

    messagesContainer.appendChild(
      errorState
    );
  }

  // ==========================================================
  // SCROLL TO NEWEST MESSAGE
  // ==========================================================

  function scrollMessagesToBottom() {
    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;
  }

  // ==========================================================
  // CHECK FOR AN EXISTING MESSAGE
  // ==========================================================

  function hasRenderedMessage(messageId) {
    if (!messageId) {
      return false;
    }

    return Boolean(
      messagesContainer.querySelector(
        `[data-message-id="${String(messageId)}"]`
      )
    );
  }

  // ==========================================================
  // RENDER ONE MESSAGE
  // ==========================================================

  function renderDeliveryChatMessage(message) {
    if (!message) {
      return false;
    }

    const messageText =
      typeof message.message === "string"
        ? message.message.trim()
        : "";

    if (!messageText) {
      return false;
    }

    const messageId = String(
      message._id ||
      message.id ||
      ""
    ).trim();

    if (
      messageId &&
      hasRenderedMessage(messageId)
    ) {
      return false;
    }

    removeConversationState();

    const isTravelerMessage =
      message.senderRole === "traveler";

    const messageRow =
      document.createElement("div");

    messageRow.className =
      `delivery-chat-message ${
        isTravelerMessage
          ? "sent"
          : "received"
      }`;

    if (messageId) {
      messageRow.dataset.messageId =
        messageId;
    }

    const messageBubble =
      document.createElement("div");

    messageBubble.className =
      "delivery-chat-message-bubble";

    messageBubble.textContent =
      messageText;

    messageRow.appendChild(
      messageBubble
    );

    messagesContainer.appendChild(
      messageRow
    );

    return true;
  }

  // ==========================================================
  // RENDER MESSAGE HISTORY
  // ==========================================================

  function renderDeliveryChatHistory(messages) {
    clearMessages();

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      showEmptyConversation();
      return;
    }

    messages.forEach((message) => {
      renderDeliveryChatMessage(message);
    });

    scrollMessagesToBottom();
  }

  // ==========================================================
  // MARK RECEIVED MESSAGES AS READ
  // ==========================================================

  async function markDeliveryChatRead(
    deliveryId
  ) {
    const travelerUserId =
      getTravelerChatUserId();

    if (
      !deliveryId ||
      !travelerUserId
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/api/delivery-chat/${deliveryId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            "x-user-id":
              travelerUserId,
            "x-user-role":
              "traveler"
          }
        }
      );

      if (!response.ok) {
        const result =
          await response.json().catch(
            () => null
          );

        throw new Error(
          result?.error ||
          "Unable to update read status."
        );
      }

      broadcastTravelerChatRead(
        deliveryId
      );

    } catch (error) {
      console.error(
        "Unable to mark delivery chat as read:",
        error
      );
    }
  }

  // ==========================================================
  // LOAD EXISTING MESSAGES
  // ==========================================================

  async function loadDeliveryChatHistory(
    deliveryId
  ) {
    const travelerUserId =
      getTravelerChatUserId();

    if (!travelerUserId) {
      statusElement.textContent =
        "Unable to identify the logged-in Traveler.";

      showEmptyConversation();
      return;
    }

    showLoadingConversation();

    statusElement.textContent =
      "Loading conversation...";

    try {
      const response = await fetch(
        `${BASE_URL}/api/delivery-chat/${deliveryId}`,
        {
          method: "GET",
          headers: {
            "x-user-id":
              travelerUserId,
            "x-user-role":
              "traveler"
          }
        }
      );

      let result = null;

      try {
        result = await response.json();
      } catch (parseError) {
        console.error(
          "Delivery chat response parse error:",
          parseError
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
          result?.message ||
          "Unable to load delivery chat."
        );
      }

      if (!result?.success) {
        throw new Error(
          result?.error ||
          "Unable to load delivery chat."
        );
      }

      if (
        activeDeliveryChatId !==
        String(deliveryId)
      ) {
        return;
      }

      const messages = Array.isArray(
        result.data
      )
        ? result.data
        : [];

      renderDeliveryChatHistory(
        messages
      );

      statusElement.textContent =
        messages.length > 0
          ? "Conversation connected."
          : "Start a conversation with the Sender.";

      await markDeliveryChatRead(
        deliveryId
      );

    } catch (error) {
      console.error(
        "Unable to load delivery chat:",
        error
      );

      if (
        activeDeliveryChatId !==
        String(deliveryId)
      ) {
        return;
      }

      showConversationError(
        error.message
      );

      statusElement.textContent =
        "Conversation unavailable.";
    }
  }

  // ==========================================================
  // CONNECT AND JOIN WEBSOCKET CHAT ROOM
  // ==========================================================

  function connectDeliveryChatSocket(
    deliveryId
  ) {
    if (!deliveryId) {
      return;
    }

    connectTravelerSocket();

    joinTravelerDeliveryChat(
      deliveryId
    );

    if (
      ws &&
      ws.readyState === WebSocket.OPEN
    ) {
      statusElement.textContent =
        "Connecting to real-time chat...";
    }
  }

  // ==========================================================
  // OPEN DELIVERY CHAT
  // ==========================================================

  function openDeliveryChat(deliveryId) {
    if (!deliveryId) {
      console.warn(
        "Cannot open delivery chat without a delivery ID."
      );

      return;
    }

    activeDeliveryChatId =
      String(deliveryId);

    panel.dataset.deliveryId =
      activeDeliveryChatId;

    panel.classList.add("open");

    panel.setAttribute(
      "aria-hidden",
      "false"
    );

    input.value = "";
    input.disabled = false;
    sendBtn.disabled = false;

    if (
      window.lucide &&
      typeof window.lucide.createIcons ===
        "function"
    ) {
      window.lucide.createIcons();
    }

    connectDeliveryChatSocket(
      activeDeliveryChatId
    );

    loadDeliveryChatHistory(
      activeDeliveryChatId
    );

    window.setTimeout(() => {
      input.focus();
    }, 0);
  }

  // ==========================================================
  // CLOSE DELIVERY CHAT
  // ==========================================================

  function closeDeliveryChat() {
    panel.classList.remove("open");

    panel.setAttribute(
      "aria-hidden",
      "true"
    );

    delete panel.dataset.deliveryId;

    statusElement.textContent = "";

    input.value = "";
    input.disabled = false;
    sendBtn.disabled = false;

    clearMessages();

    activeDeliveryChatId = null;
    activeSocketChatDeliveryId = null;
  }

  // ==========================================================
  // SEND DELIVERY MESSAGE
  // ==========================================================

  async function sendDeliveryChatMessage() {
    if (deliveryChatSending) {
      return;
    }

    const deliveryId =
      activeDeliveryChatId;

    const travelerUserId =
      getTravelerChatUserId();

    const messageText =
      input.value.trim();

    if (!deliveryId) {
      statusElement.textContent =
        "No active delivery conversation.";

      return;
    }

    if (!travelerUserId) {
      statusElement.textContent =
        "Unable to identify the logged-in Traveler.";

      return;
    }

    if (!messageText) {
      statusElement.textContent =
        "Type a message before sending.";

      input.focus();
      return;
    }

    if (messageText.length > 2000) {
      statusElement.textContent =
        "Message cannot exceed 2000 characters.";

      input.focus();
      return;
    }

    deliveryChatSending = true;
    sendBtn.disabled = true;
    input.disabled = true;

    statusElement.textContent =
      "Sending message...";

    try {
      const response = await fetch(
        `${BASE_URL}/api/delivery-chat/${deliveryId}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-user-id":
              travelerUserId,
            "x-user-role":
              "traveler"
          },
          body: JSON.stringify({
            message: messageText
          })
        }
      );

      let result = null;

      try {
        result = await response.json();
      } catch (parseError) {
        console.error(
          "Delivery message response parse error:",
          parseError
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
          result?.message ||
          "Unable to send message."
        );
      }

      if (
        !result?.success ||
        !result?.data
      ) {
        throw new Error(
          result?.error ||
          "The message was not saved."
        );
      }

      if (
        activeDeliveryChatId !==
        String(deliveryId)
      ) {
        return;
      }

      renderDeliveryChatMessage(
        result.data
      );

      scrollMessagesToBottom();

      input.value = "";

      statusElement.textContent =
        "Message sent.";

      const savedMessageId =
        result.data._id ||
        result.data.id;

      if (savedMessageId) {
        const broadcastSuccessful =
          broadcastTravelerDeliveryMessage(
            deliveryId,
            savedMessageId
          );

        if (!broadcastSuccessful) {
          connectTravelerSocket();

          joinTravelerDeliveryChat(
            deliveryId
          );

          statusElement.textContent =
            "Message saved. Real-time connection is reconnecting.";
        }
      }

    } catch (error) {
      console.error(
        "Unable to send delivery message:",
        error
      );

      if (
        activeDeliveryChatId ===
        String(deliveryId)
      ) {
        statusElement.textContent =
          error.message ||
          "Unable to send message.";
      }

    } finally {
      deliveryChatSending = false;
      sendBtn.disabled = false;
      input.disabled = false;

      if (
        activeDeliveryChatId ===
        String(deliveryId)
      ) {
        input.focus();
      }
    }
  }

  // ==========================================================
  // DYNAMIC CHAT BUTTON HANDLER
  // ==========================================================

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const chatButton = target.closest(
        ".delivery-chat-btn"
      );

      if (!chatButton) {
        return;
      }

      event.preventDefault();

      const deliveryId =
        chatButton.dataset.id;

      openDeliveryChat(
        deliveryId
      );
    }
  );

  // ==========================================================
  // CLOSE BUTTON
  // ==========================================================

  closeBtn.addEventListener(
    "click",
    closeDeliveryChat
  );

  // ==========================================================
  // CLOSE WHEN BACKDROP IS CLICKED
  // ==========================================================

  panel.addEventListener(
    "click",
    (event) => {
      if (event.target === panel) {
        closeDeliveryChat();
      }
    }
  );

  // ==========================================================
  // CLOSE WITH ESCAPE
  // ==========================================================

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        panel.classList.contains(
          "open"
        )
      ) {
        closeDeliveryChat();
      }
    }
  );

  // ==========================================================
  // SEND WITH ENTER
  // Shift + Enter creates a new line.
  // ==========================================================

  input.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        sendDeliveryChatMessage();
      }
    }
  );

  // ==========================================================
  // SEND BUTTON
  // ==========================================================

  sendBtn.addEventListener(
    "click",
    sendDeliveryChatMessage
  );

  // ==========================================================
  // WEBSOCKET CHAT JOIN RESULT
  // ==========================================================

  window.addEventListener(
    "flexago:delivery-chat-joined",
    (event) => {
      const message =
        event.detail;

      if (
        !message ||
        String(message.deliveryId) !==
          String(activeDeliveryChatId)
      ) {
        return;
      }

      if (message.success) {
        statusElement.textContent =
          "Real-time chat connected.";

        markDeliveryChatRead(
          activeDeliveryChatId
        );

      } else {
        statusElement.textContent =
          message.error ||
          "Unable to join real-time chat.";
      }
    }
  );

  // ==========================================================
  // REAL-TIME INCOMING MESSAGE
  // ==========================================================

  window.addEventListener(
    "flexago:delivery-chat-message",
    (event) => {
      const socketMessage =
        event.detail;

      if (
        !socketMessage ||
        !socketMessage.data
      ) {
        return;
      }

      const deliveryId =
        String(
          socketMessage.deliveryId ||
          socketMessage.data.deliveryId ||
          ""
        );

      if (
        deliveryId !==
        String(activeDeliveryChatId)
      ) {
        return;
      }

      const rendered =
        renderDeliveryChatMessage(
          socketMessage.data
        );

      if (!rendered) {
        return;
      }

      scrollMessagesToBottom();

      const isSenderMessage =
        socketMessage.data.senderRole ===
        "sender";

      if (isSenderMessage) {
        statusElement.textContent =
          "New message from the Sender.";

        markDeliveryChatRead(
          activeDeliveryChatId
        );

      } else {
        statusElement.textContent =
          "Message delivered.";
      }
    }
  );

  // ==========================================================
  // REAL-TIME READ STATUS
  // ==========================================================

  window.addEventListener(
    "flexago:delivery-chat-read",
    (event) => {
      const readMessage =
        event.detail;

      if (
        !readMessage ||
        String(readMessage.deliveryId) !==
          String(activeDeliveryChatId)
      ) {
        return;
      }

      if (
        readMessage.readBy?.role ===
        "sender"
      ) {
        statusElement.textContent =
          "Read by Sender.";
      }
    }
  );

  // ==========================================================
  // REAL-TIME SOCKET ERROR
  // ==========================================================

  window.addEventListener(
    "flexago:delivery-chat-error",
    (event) => {
      const socketError =
        event.detail;

      if (!activeDeliveryChatId) {
        return;
      }

      statusElement.textContent =
        socketError?.error ||
        "Real-time chat connection error.";
    }
  );
}
// ============================================================
// SUPPORT CHAT WIDGET
// ============================================================

function initChatWidget() {
  const toggleBtn = document.getElementById(
    "chatToggleBtn"
  );

  const bubble = document.getElementById(
    "chatBubble"
  );

  const closeBtn = document.getElementById(
    "chatCloseBtn"
  );

  const sendBtn = document.getElementById(
    "chatSendBtn"
  );

  const input = document.getElementById(
    "chatInput"
  );

  const body = document.getElementById(
    "chatBody"
  );

  if (
    !toggleBtn ||
    !bubble ||
    !closeBtn ||
    !sendBtn ||
    !input ||
    !body
  ) {
    return;
  }

  toggleBtn.addEventListener(
    "click",
    () => {
      bubble.classList.toggle("open");
    }
  );

  closeBtn.addEventListener(
    "click",
    () => {
      bubble.classList.remove("open");
    }
  );

  sendBtn.addEventListener(
    "click",
    () => {
      const text = input.value.trim();

      if (!text) {
        return;
      }

      appendChatMessage(
        body,
        text,
        "user"
      );

      input.value = "";

      appendChatMessage(
        body,
        "Thanks! A support agent will review your delivery details shortly.",
        "system"
      );
    }
  );
}

function appendChatMessage(
  container,
  text,
  type
) {
  const div = document.createElement(
    "div"
  );

  div.style.marginBottom =
    "0.35rem";

  div.style.fontSize =
    "0.75rem";

  div.style.color =
    type === "user"
      ? "#e5e7eb"
      : "#9ca3af";

  div.textContent = text;

  container.appendChild(div);

  container.scrollTop =
    container.scrollHeight;
}
/* ============================================================
   JOB TABS
   ============================================================ */
function initJobsTabs() {
  const tabs = document.querySelectorAll(".jobs-tab");
const lists = {
  available: document.getElementById("jobsAvailableList"),
  accepted: document.getElementById("jobsAcceptedList"),
  picked_up: document.getElementById("jobsPickedUpList"),   // ⭐ NEW
  completed: document.getElementById("jobsCompletedList")
};


  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      Object.keys(lists).forEach(key => {
        if (lists[key]) {
          lists[key].classList.toggle("hidden", key !== target);
        }
      });
    });
  });
}

/* ============================================================
   ACCOUNT • VERIFICATION • PAYOUTS
   ============================================================ */

/* ACCOUNT STATE */
let accountState = {
  profilePhoto: null,
  firstName: "",
  lastName: "",
  dob: "",
  phone: "",
  email: ""
};

let accountOriginalState = null;

/* ACCOUNT PAGE INIT */
function initAccountPage() {
  safe(initProfilePhotoUpload);
  safe(initAccountFieldTracking);
  safe(initAccountSaveButton);
  safe(loadAccountData);
}

/* PROFILE PHOTO UPLOAD */
function initProfilePhotoUpload() {
  const btn = document.getElementById("profilePhotoUploadBtn");
  const input = document.getElementById("profilePhotoInput");
  const preview = document.getElementById("profilePhotoPreview");

  if (!btn || !input || !preview) return;

  btn.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      preview.src = dataUrl;
      accountState.profilePhoto = dataUrl;
      markAccountDirty();
    };
    reader.readAsDataURL(file);
  });
}

/* ACCOUNT FIELD TRACKING */
function initAccountFieldTracking() {
  const fields = [
    "firstNameInput",
    "lastNameInput",
    "dobInput",
    "phoneInput",
    "emailInput"
  ];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      syncAccountState();
      markAccountDirty();
    });
  });
}

function syncAccountState() {
  accountState.firstName = valueOf("firstNameInput");
  accountState.lastName = valueOf("lastNameInput");
  accountState.dob = valueOf("dobInput");
  accountState.phone = valueOf("phoneInput");
  accountState.email = valueOf("emailInput");
}

function markAccountDirty() {
  const btn = document.getElementById("saveAccountBtn");
  if (!btn) return;
  btn.disabled = false;
  btn.classList.remove("disabled");
}

/* SAVE BUTTON */
function initAccountSaveButton() {
  const btn = document.getElementById("saveAccountBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (btn.disabled) return;

    btn.disabled = true;
    btn.classList.add("disabled");
    const originalText = btn.textContent;
    btn.textContent = "Saving...";

    syncAccountState();

    try {
      await fakeSaveAccountApi(accountState);
      accountOriginalState = JSON.parse(JSON.stringify(accountState));
      showAccountToast("Your account details have been saved.");
    } catch (err) {
      showAccountToast("Unable to save changes. Please try again.");
      btn.disabled = false;
      btn.classList.remove("disabled");
    } finally {
      btn.textContent = originalText;
    }
  });
}

async function fakeSaveAccountApi(payload) {
  return new Promise(resolve => setTimeout(resolve, 800));
}

function showAccountToast(message) {
  alert(message);
}

/* LOAD EXISTING ACCOUNT DATA */
async function loadAccountData() {
  const data = null;

  if (!data) {
    accountOriginalState = JSON.parse(JSON.stringify(accountState));
    return;
  }

  accountOriginalState = JSON.parse(JSON.stringify(accountState));
}

/* ACCOUNT HELPERS */
function valueOf(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

/* ============================================================
   VERIFICATION
   ============================================================ */

let verificationState = {
  step1: null,
  step2: null,
  step3: null,
  step4: null,
  submitted: false
};

function initVerificationPage() {
  safe(initVerificationUploads);
  safe(updateVerificationProgressBar);
  safe(updateVerificationStatusBadge);
  safe(initVerificationSubmit);
}

/* UPLOAD HANDLER */
function initVerificationUploads() {
  setupUpload(1);
  setupUpload(2);
  setupUpload(3);
  setupUpload(4);
}

function setupUpload(step) {
  const box = document.getElementById(`uploadBox${step}`);
  const input = document.getElementById(`fileInput${step}`);
  const preview = document.getElementById(`preview${step}`);

  if (!box || !input) return;

  box.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      verificationState[`step${step}`] = reader.result;

      preview.src = reader.result;
      preview.classList.remove("hidden");

      updateVerificationProgressBar();
      updateVerificationStatusBadge();
    };

    reader.readAsDataURL(file);
  });
}

/* PROGRESS BAR */
function updateVerificationProgressBar() {
  const total = 4;
  const completed = [
    verificationState.step1,
    verificationState.step2,
    verificationState.step3,
    verificationState.step4
  ].filter(Boolean).length;

  const percent = (completed / total) * 100;

  const fill = document.getElementById("verificationProgressFill");
  if (fill) fill.style.width = percent + "%";
}

/* STATUS BADGE */
function updateVerificationStatusBadge() {
  const badge = document.getElementById("verificationStatusBadge");
  if (!badge) return;

  if (verificationState.submitted) {
    badge.textContent = "Submitted";
    badge.className = "status-badge submitted";
    return;
  }

  const completed = [
    verificationState.step1,
    verificationState.step2,

    verificationState.step3,
    verificationState.step4
  ].filter(Boolean).length;

  if (completed === 4) {
    badge.textContent = "Ready to Submit";
    badge.className = "status-badge ready";
  } else {
    badge.textContent = "Pending";
    badge.className = "status-badge pending";
  }
}

/* SUBMIT VERIFICATION — UPDATED URL */
function initVerificationSubmit() {
  const btn = document.querySelector("#template-verification .primary-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const allDone =
      verificationState.step1 &&
      verificationState.step2 &&
      verificationState.step3 &&
      verificationState.step4;

    if (!allDone) {
      alert("Please complete all 4 steps before submitting.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {
      const res = await fetch(`${BASE_URL}/api/traveler/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idFront: verificationState.step1,
          idBack: verificationState.step2,
          selfie: verificationState.step3,
          addressProof: verificationState.step4
        })
      });

      if (!res.ok) throw new Error("Verification submission failed");

      verificationState.submitted = true;
      updateVerificationStatusBadge();

      btn.textContent = "Submitted";
    } catch (err) {
      alert("Unable to submit verification. Please try again.");
      btn.disabled = false;
      btn.textContent = "Submit Verification";
    }
  });
}

/* SUCCESS / FAILURE NAVIGATION */
function showVerificationSuccess() {
  document.getElementById("template-verification").classList.add("hidden");
  document.getElementById("template-verification-failed").classList.add("hidden");
  document.getElementById("template-verification-success").classList.remove("hidden");

  const backBtn = document.getElementById("backToAccount");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      loadPage("account");
    });
  }
}

function showVerificationFailed() {
  document.getElementById("template-verification").classList.add("hidden");
  document.getElementById("template-verification-success").classList.add("hidden");
  document.getElementById("template-verification-failed").classList.remove("hidden");

  const retryBtn = document.getElementById("retryVerification");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      loadPage("verification");
    });
  }
}

/* ============================================================
   PAYOUTS — UPDATED URLS
   ============================================================ */
function initPayoutsPage() {
  safe(loadPayoutMethod);
  safe(initPayoutForm);

  const openAddPayment = document.getElementById("openAddPaymentModal");
  const addPaymentModal = document.getElementById("addPaymentModal");
  const closeAddPayment = document.getElementById("closeAddPaymentModal");

  if (openAddPayment) {
    openAddPayment.addEventListener("click", () => {
      if (addPaymentModal) addPaymentModal.classList.remove("hidden");
    });
  }

  if (closeAddPayment) {
    closeAddPayment.addEventListener("click", () => {
      if (addPaymentModal) addPaymentModal.classList.add("hidden");
    });
  }

  const cardFields = document.getElementById("cardFields");
  const bankFields = document.getElementById("bankFields");

  document.querySelectorAll("input[name='payoutType']").forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "card") {
        cardFields?.classList.remove("hidden");
        bankFields?.classList.add("hidden");
      } else {
        cardFields?.classList.add("hidden");
        bankFields?.classList.remove("hidden");
      }
    });
  });
}

async function loadPayoutMethod() {
  try {
    const res = await fetch(`${BASE_URL}/api/traveler/payouts`);
    if (!res.ok) return;

    const data = await res.json();
    const display = document.getElementById("payoutMethodDisplay");
    if (!display) return;

    if (data.type === "card") display.textContent = `Card •••• ${data.last4}`;
    if (data.type === "bank") display.textContent = `Bank Account •••• ${data.last4}`;
  } catch (err) {
    console.error("Failed to load payout method:", err);
  }
}

function initPayoutForm() {
  const saveBtn = document.getElementById("savePaymentMethod");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async () => {
    const type = document.querySelector("input[name='payoutType']:checked")?.value;
    if (!type) return alert("Please select a payout method.");

    const error = type === "card" ? validateCardFields() : validateBankFields();
    if (error) return alert(error);

    let payload = { type };

    if (type === "card") {
      payload.card = {
        number: valueOf("cardNumber"),
        expiry: valueOf("cardExpiry"),
        cvc: valueOf("cardCVC"),
        name: valueOf("cardName")
      };
    }

    if (type === "bank") {
      const routing = valueOf("bankRoutingInput");
      const account = valueOf("bankAccountInput");
      const iban = valueOf("bankIbanInput");
      payload.bank = iban ? { iban } : { routing, account };
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const res = await fetch(`${BASE_URL}/api/traveler/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save payout method");

      alert("Payout method saved.");
      await loadPayoutMethod();
    } catch (err) {
      alert("Unable to save payout method.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });
}
function initJobDetailsModal() {
  const modal = document.getElementById("jobDetailsModal");
  const closeBtn = modal?.querySelector(".modal-close");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }
}
// ===============================
// JOB DETAILS MODAL FUNCTIONS
// ===============================
function openJobDetailsModal(job) {
  const modal = document.getElementById("jobDetailsModal");
  if (!modal) return;

  // --- Determine the REAL delivery ID ---
  const deliveryId =
    job.deliveryId ||
    job.delivery?._id ||
    job.id ||
    job._id;

  // -------------------------------
  // PICKUP / DROPOFF
  // -------------------------------
  modal.querySelector(".pickup").textContent =
    job.pickupAddress ||
    job.pickup?.address ||
    "—";

  modal.querySelector(".dropoff").textContent =
    job.dropoffAddress ||
    job.dropoff?.address ||
    "—";

  // -------------------------------
  // TRAVEL TYPE
  // -------------------------------
  modal.querySelector(".travelType").textContent =
    job.travelType || "Local";
// -------------------------------
// RECEIVER INSTRUCTIONS
// -------------------------------
modal.querySelector(".receiverInstructions").textContent =
  job.receiver?.instructions || "No instructions provided";

// -------------------------------
// DELIVERY NOTES
// -------------------------------
modal.querySelector(".deliveryNotes").textContent =
  job.proofOfDelivery?.notes || "No notes provided";


// -------------------------------
// PREPARE COORDINATES (GLOBAL FOR THIS FUNCTION)
// -------------------------------
let pickupLat, pickupLon, dropoffLat, dropoffLon, distance;


// -------------------------------
// MILES (CALCULATE FROM COORDINATES)
// -------------------------------
try {
  const pickupCoords = job.pickup?.location?.coordinates;
  const dropoffCoords = job.dropoff?.location?.coordinates;

  if (pickupCoords && dropoffCoords) {
    [pickupLon, pickupLat] = pickupCoords;
    [dropoffLon, dropoffLat] = dropoffCoords;

    const R = 3958.8; // miles
    const dLat = (dropoffLat - pickupLat) * Math.PI / 180;
    const dLon = (dropoffLon - pickupLon) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(pickupLat * Math.PI / 180) *
      Math.cos(dropoffLat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

    distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    modal.querySelector(".miles").textContent = distance.toFixed(1) + " mi";
  } else {
    modal.querySelector(".miles").textContent = "—";
  }
} catch (err) {
  modal.querySelector(".miles").textContent = "—";
}


// -------------------------------
// ETA (ESTIMATED TRAVEL TIME)
// -------------------------------
if (distance) {
  const avgSpeed = 30; // mph
  const etaHours = distance / avgSpeed;
  const etaMinutes = Math.round(etaHours * 60);

  modal.querySelector(".eta").textContent = etaMinutes + " min";
} else {
  modal.querySelector(".eta").textContent = "—";
}

  // -------------------------------
  // PAYOUT
  // -------------------------------
  modal.querySelector(".payout").textContent =
    "$" + (job.payout != null ? Number(job.payout).toFixed(2) : "0.00");


  // -------------------------------
  // SENDER
  // -------------------------------
  modal.querySelector(".senderName").textContent =
    job.sender?.name ||
    job.senderName ||
    "—";

  modal.querySelector(".senderPhone").textContent =
    job.sender?.phone ||
    job.senderPhone ||
    "—";

  // -------------------------------
  // RECEIVER
  // -------------------------------
  modal.querySelector(".receiverName").textContent =
    job.receiver?.name ||
    job.receiverName ||
    "—";

  modal.querySelector(".receiverPhone").textContent =
    job.receiver?.phone ||
    job.receiverPhone ||
    "—";

  // -------------------------------
  // PACKAGE DETAILS
  // -------------------------------
  modal.querySelector(".itemDescription").textContent =
    job.package?.description || "—";

  modal.querySelector(".itemSize").textContent =
    job.package?.size || "—";

  modal.querySelector(".itemWeight").textContent =
    job.package?.weight || "—";

  // -------------------------------
  // PHOTO
  // -------------------------------
  const photoEl = modal.querySelector(".itemPhoto");
  const photoUrl = job.package?.photoUrl;

  if (photoUrl) {
    photoEl.src = photoUrl;
    photoEl.style.display = "block";
  } else {
    photoEl.style.display = "none";
  }

  // -------------------------------
  // BUTTON HANDLERS (UPDATED WORKFLOW)
  // -------------------------------
  const acceptBtn = modal.querySelector(".modal-accept");
  const declineBtn = modal.querySelector(".modal-decline");
  const completeBtn = modal.querySelector(".modal-complete");     // opens Proof of Delivery modal
  const deliveredBtn = modal.querySelector(".modal-delivered");   // submits final delivery

  if (acceptBtn) acceptBtn.onclick = () => acceptJob(deliveryId);
  if (declineBtn) declineBtn.onclick = () => declineJob(deliveryId);

  // ⭐ COMPLETE DELIVERY → OPEN PROOF OF DELIVERY MODAL
  if (completeBtn) {
    completeBtn.onclick = () => {
      openProofOfDeliveryModal(job);   // <-- correct modal
    };
  }

  // ⭐ DELIVERED → SUBMIT DELIVERY
  if (deliveredBtn) {
    deliveredBtn.onclick = () => {
      completeJob(deliveryId);         // <-- correct submit
    };
  }

  // -------------------------------
  // SHOW MODAL
  // -------------------------------
  modal.classList.remove("hidden");
}

function closeJobDetailsModal() {
  document.getElementById("jobDetailsModal").classList.add("hidden");
}


/* ============================================================
   SUPPORT PAGE
   ============================================================ */
function initSupportPage() {
  // Placeholder
}

/* ============================================================
   TRAVELER ID LOADING — FINAL VERSION
   ============================================================ */
async function loadTravelerIdentity() {
  try {
    if (!window.userId) {
      console.warn("No userId on window — cannot load traveler");
      return;
    }

    console.log("Loading traveler for userId:", window.userId);

    // ⭐ Correct route — list all travelers
    const res = await fetch(`${BASE_URL}/api/traveler`);
    const json = await res.json();

    if (!json.success || !Array.isArray(json.data)) {
      console.error("Traveler API returned unexpected format:", json);
      return;
    }

    // ⭐ Find traveler whose "user" matches the logged-in userId
    const traveler = json.data.find(t => t.user === window.userId);

    if (!traveler) {
      console.error("No traveler profile found for user:", window.userId);
      return;
    }

    // ⭐ Set travelerId correctly
    window.travelerId = traveler._id;
    console.log("Traveler ID loaded:", window.travelerId);

/* ============================================================
   LOAD TRAVELER PROFILE INTO UI (NO FALLBACK "T")
============================================================ */

// Full name
const fullName = `${traveler.firstName || ""} ${traveler.lastName || ""}`.trim();
if (fullName.length > 0) {
  document.getElementById("travelerNameHeader").textContent = fullName;
}

// Identity fields (readonly)
document.getElementById("travelerFirstName").value = traveler.firstName || "";
document.getElementById("travelerLastName").value = traveler.lastName || "";
document.getElementById("travelerEmail").value = traveler.email || "";
document.getElementById("travelerPhone").value = traveler.phone || "";

// DOB
if (traveler.dob) {
  document.getElementById("travelerDob").value = traveler.dob.split("T")[0];
}

// Address fields (editable)
document.getElementById("travelerAddress").value = traveler.address || "";
document.getElementById("travelerCity").value = traveler.city || "";
document.getElementById("travelerState").value = traveler.state || "";
document.getElementById("travelerZipcode").value = traveler.zipcode || "";
document.getElementById("travelerCountry").value = traveler.country || "";

// Photo
if (traveler.photoUrl) {
  document.getElementById("travelerProfilePhotoPreview").src = traveler.photoUrl;
}

/* ============================================================
       ⭐ LOAD JOBS ONLY AFTER travelerId EXISTS
============================================================ */
    await loadJobs();

  } catch (err) {
    console.error("Error loading traveler identity:", err);
  }
}

/* ============================================================
   TRAVELER PHOTO UPLOAD
============================================================ */
function initTravelerPhotoUpload() {
  const input = document.getElementById("travelerProfilePhotoInput");
  const btn = document.getElementById("travelerProfilePhotoUploadBtn");
  const preview = document.getElementById("travelerProfilePhotoPreview");

  if (!input || !btn || !preview) return;

  btn.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    preview.src = URL.createObjectURL(file);
    console.log("Traveler photo selected:", file.name);

    // TODO: Upload to backend
  });
}

/* ============================================================
   SAVE TRAVELER ACCOUNT
============================================================ */
async function saveTravelerAccount() {
  console.log("Saving traveler account...");

  const payload = {
    address: document.getElementById("travelerAddress").value.trim(),
    city: document.getElementById("travelerCity").value.trim(),
    state: document.getElementById("travelerState").value.trim(),
    zipcode: document.getElementById("travelerZipcode").value.trim(),
    country: document.getElementById("travelerCountry").value.trim(),
  };

  console.log("Payload:", payload);

  alert("Traveler account updated (placeholder).");
}

/* ============================================================
   TRAVELER ACCOUNT LAYOUT — MATCH SENDER
============================================================ */
function initTravelerAccountLayout() {
  const container = document.querySelector(".account-page");
  if (!container) return;

  container.classList.add("page-template");
  container.classList.add("account-page");
}

/* ============================================================
   TRAVELER ACCOUNT VIEW INITIALIZER (REQUIRED)
============================================================ */
function initTravelerAccountView() {
  // Load identity fields (readonly)
  safe(loadTravelerIdentity);

  // ⭐ Apply Sender-style layout (CRITICAL)
  safe(initTravelerAccountLayout);

  // Attach save button
  const saveBtn = document.getElementById("saveTravelerAccountBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveTravelerAccount);
  }

  // Initialize photo upload
  safe(initTravelerPhotoUpload);

  console.log("Traveler Account View initialized.");
}

/* ============================================================
   PAGE SWITCHING
============================================================ */

function loadPage(view) {
  const dynamic =
    document.getElementById("dynamicView");

  const jobsLayout =
    document.getElementById("jobsLayout");

  if (!dynamic || !jobsLayout) {
    console.error(
      "dynamicView or jobsLayout was not found"
    );

    return;
  }

  /* ==========================================================
     JOBS VIEW
  ========================================================== */

  if (view === "jobs") {
    dynamic.classList.add("hidden");
    jobsLayout.classList.remove("hidden");

    setTimeout(() => {
      safe(initTravelerMap);
      safe(initTravelerAutocomplete);
      safe(initRoutePlanner);
      safe(initJobsTabs);
    }, 50);

    return;
  }

  /* ==========================================================
     ALL OTHER VIEWS
  ========================================================== */

  jobsLayout.classList.add("hidden");
  dynamic.classList.remove("hidden");

  /* ==========================================================
     ACCOUNT VIEW
  ========================================================== */

  if (view === "account") {
    const accountView =
      document.getElementById(
        "travelerAccountView"
      );

    if (!accountView) {
      console.error(
        "travelerAccountView not found"
      );

      return;
    }

    dynamic.innerHTML =
      accountView.innerHTML;

    setTimeout(() => {
      safe(initTravelerAccountView);

      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 20);
  }

  /* ==========================================================
     VERIFICATION VIEW
  ========================================================== */

  else if (view === "verification") {
    const verificationView =
      document.getElementById(
        "template-verification"
      );

    if (!verificationView) {
      console.error(
        "template-verification not found"
      );

      return;
    }

    dynamic.innerHTML =
      verificationView.innerHTML;

    setTimeout(() => {
      safe(initVerificationPage);

      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 20);
  }

  /* ==========================================================
     PAYOUTS VIEW
  ========================================================== */

  else if (view === "payments") {
    const payoutsView =
      document.getElementById(
        "travelerPaymentsView"
      );

    if (!payoutsView) {
      console.error(
        "travelerPaymentsView not found"
      );

      return;
    }

    dynamic.innerHTML =
      payoutsView.innerHTML;

    setTimeout(() => {
      safe(initTravelerPayoutView);
      safe(initTravelerPaymentFormatting);

      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 20);
  }

  /* ==========================================================
     SUPPORT VIEW
  ========================================================== */

  else if (view === "support") {
    const supportPanel =
      document.getElementById(
        "supportPanel"
      );

    if (!supportPanel) {
      console.error(
        "supportPanel not found"
      );

      return;
    }

    dynamic.innerHTML =
      supportPanel.innerHTML;

    setTimeout(() => {
      safe(initSupportPage);

      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 20);
  }

  /* ==========================================================
     UNKNOWN VIEW
  ========================================================== */

  else {
    console.error(
      `Unknown traveler view: ${view}`
    );
  }
}
/* ============================================================
   SIDEBAR NAVIGATION (FINAL)
============================================================ */
function initTravelerSidebar() {
  const items = document.querySelectorAll(".sidebar-item");
  if (!items.length) return;

  items.forEach(btn => {
    btn.addEventListener("click", () => {
      items.forEach(i => i.classList.remove("active"));
      btn.classList.add("active");

      const view = btn.getAttribute("data-view");
      loadPage(view);
      window.scrollTo(0, 0);
    });
  });
}

/* ============================================================
   JOB SEARCH HANDLER
============================================================ */
function initJobSearch() {
  function attach() {
    const btn = document.getElementById("searchJobsBtn");
    if (!btn) {
      console.warn("Search Jobs button not found — retrying...");
      return setTimeout(attach, 300);
    }

    console.log("✅ Search button ready");

    btn.addEventListener("click", () => {
      if (!currentTravelerStart || !currentTravelerDest) {
        console.warn("Missing start or destination");
        return;
      }

      console.log("🔍 Searching for jobs...");
      updateTravelerRoute();
      loadAvailableJobs();
    });
  }

  attach();
}

/* ============================================================
   PAYOUT VIEW INITIALIZER - TRAVELER VERSION
============================================================ */
/* ============================================================
   TRAVELER STRIPE CONNECT STATUS
============================================================ */

async function loadTravelerStripeStatus() {
  if (!window.travelerId) {
    throw new Error(
      "Traveler profile ID is missing. Please refresh and try again."
    );
  }

  const statusDisplay =
    document.getElementById("stripeConnectStatus");

  const detailsDisplay =
    document.getElementById("stripeConnectDetails");

  const connectBtn =
    document.getElementById("connectStripeBtn");

  if (statusDisplay) {
    statusDisplay.innerHTML = `
      <i data-lucide="loader-circle"></i>
      <span>Checking Stripe status...</span>
    `;
  }

  const response = await fetch(
    `${BASE_URL}/api/traveler-stripe/status/${window.travelerId}`
  );

  const responseText =
    await response.text();

  let result = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(
        `Stripe status returned an invalid response. Status: ${response.status}`
      );
    }
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ||
      `Unable to retrieve Stripe status. Status: ${response.status}`
    );
  }

  console.log(
    "Traveler Stripe status:",
    result
  );

  if (!result.connected) {
    if (statusDisplay) {
      statusDisplay.innerHTML = `
        <i data-lucide="circle-alert"></i>
        <span>Not Connected</span>
      `;
    }

    if (detailsDisplay) {
      detailsDisplay.textContent =
        "Connect Stripe to receive delivery payouts.";
    }

    if (connectBtn) {
      connectBtn.textContent =
        "Connect Stripe Account";

      connectBtn.disabled = false;
    }
  } else if (result.onboardingComplete) {
    if (statusDisplay) {
      statusDisplay.innerHTML = `
        <i data-lucide="circle-check"></i>
        <span>Connected and Ready for Payouts</span>
      `;
    }

    if (detailsDisplay) {
      detailsDisplay.innerHTML = `
        <div>
          Stripe account: ${result.accountId}
        </div>
        <div>
          Payouts enabled: Yes
        </div>
      `;
    }

    if (connectBtn) {
      connectBtn.textContent =
        "Stripe Connected";

      connectBtn.disabled = true;
    }
  } else {
    if (statusDisplay) {
      statusDisplay.innerHTML = `
        <i data-lucide="clock"></i>
        <span>Onboarding Incomplete</span>
      `;
    }

    if (detailsDisplay) {
      const requiredItems =
        Array.isArray(result.currentlyDue)
          ? result.currentlyDue.length
          : 0;

      detailsDisplay.innerHTML = `
        <div>
          Stripe account: ${result.accountId}
        </div>
        <div>
          Remaining requirements: ${requiredItems}
        </div>
      `;
    }

    if (connectBtn) {
      connectBtn.textContent =
        "Continue Stripe Onboarding";

      connectBtn.disabled = false;
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }

  return result;
}

/* ============================================================
   START TRAVELER STRIPE ONBOARDING
============================================================ */

async function startTravelerStripeOnboarding() {
  if (!window.travelerId) {
    throw new Error(
      "Traveler profile ID is missing. Please refresh and try again."
    );
  }

  const connectBtn =
    document.getElementById("connectStripeBtn");

  const originalButtonText =
    connectBtn?.textContent ||
    "Connect Stripe Account";

  try {
    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.textContent =
        "Preparing Stripe...";
    }

    const accountResponse = await fetch(
      `${BASE_URL}/api/traveler-stripe/create-account`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          travelerId:
            window.travelerId,

          country: "US"
        })
      }
    );

    const accountResponseText =
      await accountResponse.text();

    let accountResult = {};

    if (accountResponseText) {
      try {
        accountResult =
          JSON.parse(accountResponseText);
      } catch (parseError) {
        throw new Error(
          `Stripe account endpoint returned an invalid response. Status: ${accountResponse.status}`
        );
      }
    }

    if (
      !accountResponse.ok ||
      !accountResult.success
    ) {
      throw new Error(
        accountResult.error ||
        `Unable to create Stripe account. Status: ${accountResponse.status}`
      );
    }

    console.log(
      "Stripe connected account:",
      accountResult
    );

    if (connectBtn) {
      connectBtn.textContent =
        "Opening Stripe...";
    }

    const linkResponse = await fetch(
      `${BASE_URL}/api/traveler-stripe/onboarding-link`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          travelerId:
            window.travelerId
        })
      }
    );

    const linkResponseText =
      await linkResponse.text();

    let linkResult = {};

    if (linkResponseText) {
      try {
        linkResult =
          JSON.parse(linkResponseText);
      } catch (parseError) {
        throw new Error(
          `Stripe onboarding endpoint returned an invalid response. Status: ${linkResponse.status}`
        );
      }
    }

    if (
      !linkResponse.ok ||
      !linkResult.success
    ) {
      throw new Error(
        linkResult.error ||
        `Unable to create Stripe onboarding link. Status: ${linkResponse.status}`
      );
    }

    if (!linkResult.onboardingUrl) {
      throw new Error(
        "Stripe did not return an onboarding URL."
      );
    }

    window.location.assign(
      linkResult.onboardingUrl
    );
  } catch (error) {
    console.error(
      "Traveler Stripe onboarding failed:",
      error
    );

    alert(
      error.message ||
      "Unable to start Stripe onboarding."
    );

    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.textContent =
        originalButtonText;
    }
  }
}
function initTravelerPayoutView() {
  console.log("initTravelerPayoutView initialized");
  const connectStripeBtn =
    document.getElementById(
      "connectStripeBtn"
    );

  const refreshStripeStatusBtn =
    document.getElementById(
      "refreshStripeStatusBtn"
    );

  if (connectStripeBtn) {
    connectStripeBtn.addEventListener(
      "click",
      async () => {
        await startTravelerStripeOnboarding();
      }
    );
  }

  if (refreshStripeStatusBtn) {
    refreshStripeStatusBtn.addEventListener(
      "click",
      async () => {
        try {
          refreshStripeStatusBtn.disabled = true;
          refreshStripeStatusBtn.textContent =
            "Checking...";

          await loadTravelerStripeStatus();
        } catch (error) {
          console.error(
            "Stripe status refresh failed:",
            error
          );

          alert(
            error.message ||
            "Unable to refresh Stripe status."
          );
        } finally {
          refreshStripeStatusBtn.disabled = false;
          refreshStripeStatusBtn.textContent =
            "Refresh Status";
        }
      }
    );
  }

  if (window.travelerId) {
    loadTravelerStripeStatus().catch(
      error => {
        console.error(
          "Initial Stripe status check failed:",
          error
        );
      }
    );
  }
  const cardTab =
    document.getElementById("travelerPayoutCardTab");

  const bankTab =
    document.getElementById("travelerPayoutBankTab");

  const cardForm =
    document.getElementById("travelerPayoutCardForm");

  const bankForm =
    document.getElementById("travelerPayoutBankForm");

  if (
    cardTab &&
    bankTab &&
    cardForm &&
    bankForm
  ) {
    cardTab.addEventListener("click", () => {
      cardTab.classList.add("active");
      bankTab.classList.remove("active");

      cardForm.classList.remove("hidden");
      bankForm.classList.add("hidden");
    });

    bankTab.addEventListener("click", () => {
      bankTab.classList.add("active");
      cardTab.classList.remove("active");

      bankForm.classList.remove("hidden");
      cardForm.classList.add("hidden");
    });
  }

  const saveBtn =
    document.getElementById("saveTravelerPayoutBtn");

  console.log("Save button found:", saveBtn);

  if (!saveBtn) {
    console.error(
      "saveTravelerPayoutBtn not found"
    );

    return;
  }

  saveBtn.addEventListener("click", async () => {
    try {
      console.log("Traveler payout save button clicked");

      const activeTab =
        document.querySelector(
          "#dynamicView .toggle-btn.active"
        );

      const method =
        activeTab?.dataset.method;

      if (!method) {
        throw new Error(
          "Please select a payout method."
        );
      }

      if (!window.userId) {
        throw new Error(
          "Traveler user ID is missing. Please refresh or log in again."
        );
      }

      let payload;

      if (method === "card") {
        const accountName =
          document
            .getElementById("travelerCardNameInput")
            ?.value.trim() || "";

        const cardNumber =
          document
            .getElementById("travelerCardNumberInput")
            ?.value.replace(/\D/g, "") || "";

        const expiration =
          document
            .getElementById("travelerCardExpInput")
            ?.value.trim() || "";

        const cvv =
          document
            .getElementById("travelerCardCvvInput")
            ?.value.replace(/\D/g, "") || "";

        if (
          !accountName ||
          cardNumber.length < 4 ||
          !expiration ||
          cvv.length < 3
        ) {
          throw new Error(
            "Please complete all debit card fields."
          );
        }

        payload = {
          type: "card",
          accountName,
          last4: cardNumber.slice(-4)
        };
      } else if (method === "bank") {
        const accountName =
          document
            .getElementById("travelerBankNameInput")
            ?.value.trim() || "";

        const routingNumber =
          document
            .getElementById("travelerBankRoutingInput")
            ?.value.replace(/\D/g, "") || "";

        const accountNumber =
          document
            .getElementById("travelerBankAccountInput")
            ?.value.replace(/\D/g, "") || "";

        const confirmAccountNumber =
          document
            .getElementById("travelerBankConfirmInput")
            ?.value.replace(/\D/g, "") || "";

        if (
          !accountName ||
          !routingNumber ||
          accountNumber.length < 4 ||
          !confirmAccountNumber
        ) {
          throw new Error(
            "Please complete all bank account fields."
          );
        }

        if (
          accountNumber !== confirmAccountNumber
        ) {
          throw new Error(
            "Bank account numbers do not match."
          );
        }

        payload = {
          type: "bank",
          accountName,
          last4: accountNumber.slice(-4)
        };
      } else {
        throw new Error(
          "Unsupported payout method."
        );
      }

      console.log(
        "Saving Traveler payout method:",
        payload
      );

      console.log(
        "Traveler user ID:",
        window.userId
      );

      console.log(
        "Traveler profile ID:",
        window.travelerId
      );

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      const response = await fetch(
        `${BASE_URL}/api/users/payout-method/${window.userId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload)
        }
      );

      console.log(
        "Response status:",
        response.status
      );

      console.log(
        "Response OK:",
        response.ok
      );

      const responseText =
        await response.text();

      console.log(
        "Raw response:",
        responseText
      );

      let result = {};

      if (responseText) {
        try {
          result =
            JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(
            `Backend returned an invalid response. Status: ${response.status}`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
          `Request failed with status ${response.status}`
        );
      }

      if (!result.success) {
        throw new Error(
          result.error ||
          "Failed to save payout method."
        );
      }

      const methodDisplay =
        document.getElementById(
          "travelerPayoutMethodDisplay"
        );

      if (methodDisplay) {
        const methodLabel =
          payload.type === "card"
            ? "Debit Card"
            : "Bank Account";

        const iconName =
          payload.type === "card"
            ? "credit-card"
            : "banknote";

        methodDisplay.innerHTML = `
          <i data-lucide="${iconName}"></i>
          <span>${methodLabel} ending in ${payload.last4}</span>
        `;

        if (window.lucide) {
          window.lucide.createIcons();
        }
      }

      console.log(
        "Traveler payout method saved:",
        result
      );

      alert(
        "Payout method saved successfully."
      );
    } catch (error) {
      console.error(
        "Traveler payout save failed:",
        error
      );

      alert(
        error.message ||
        "Failed to save payout method."
      );
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent =
        "Save Payout Method";
    }
  });
}
/* ============================================================
   FINAL DOM READY BOOTSTRAP — TRAVELER ACCOUNT DEFAULT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  safe(initTravelerSidebar);
  //safe(initTravelerJobs);
  safe(initTravelerMap);
  safe(initDeliveryChatPanel);
  safe(initChatWidget);
  safe(initJobDetailsModal);
  safe(initRoutePlanner);
  safe(initTravelerAccountLayout);
  safe(loadTravelerIdentity);
  safe(initTravelerPhotoUpload);



  // ⭐ Default view = Account & Identity
  loadPage("account");

  const accountBtn = document.querySelector(
    '.sidebar-item[data-view="account"]'
  );
  if (accountBtn) accountBtn.classList.add("active");

});

/* ============================================================
   PAYMENT FORMATTING (CARD + EXP + CVC)
============================================================ */
function initTravelerPaymentFormatting() {

  const cardNumberInput = document.getElementById("travelerCardNumberInput");
  if (cardNumberInput) {
    cardNumberInput.addEventListener("input", () => {
      let v = cardNumberInput.value.replace(/\D/g, "").slice(0, 16);
      v = v.match(/.{1,4}/g)?.join("-") || "";
      cardNumberInput.value = v;
    });
  }

  const expInput = document.getElementById("travelerCardExpInput");
  if (expInput) {
    expInput.addEventListener("input", () => {
      let v = expInput.value.replace(/\D/g, "").slice(0, 4);
      if (v.length >= 3) {
        v = v.slice(0, 2) + "/" + v.slice(2);
      }
      expInput.value = v;
    });
  }

  const cvvInput = document.getElementById("travelerCardCvvInput");
  if (cvvInput) {
    cvvInput.addEventListener("input", () => {
      cvvInput.value = cvvInput.value.replace(/\D/g, "").slice(0, 4);
    });
  }
}
