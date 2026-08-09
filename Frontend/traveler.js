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

// 4. Traveler ID (used for acceptJob)
window.travelerId = user._id;

if (!window.travelerId) {
  alert("Error: Traveler ID missing. Please log in again.");
  window.location.href = "login.html";
}

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
const WS_URL = "wss://flexago-backend.onrender.com";

// Socket.IO removed — using native WebSocket instead


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
   ACCEPT / DECLINE (UPDATED URLs + WEBSOCKET HOOK)
   ============================================================ */
async function acceptJob(jobId) {
  try {
    const res = await fetch(`${BASE_URL}/api/deliveries/${jobId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ travelerId: window.travelerId })
    });

    const json = await res.json();

if (res.status !== 200 || json.success === false) {
  console.error("Accept failed:", json.error || json.message);
  alert("Failed to accept job");
  return;
}

    // Update local state
    acceptedJobs.push(json.data);
    availableJobs = availableJobs.filter(j => j._id !== jobId);

    // Close modal
    closeJobDetailsModal();

    // Start WebSocket for this job
    initJobSocket(jobId);

    // Refresh UI
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
   JOB LOADING (FETCH ALL JOBS FOR THIS TRAVELER)
   ============================================================ */
async function loadJobs() {
  try {
    const res = await fetch(`${BASE_URL}/api/deliveries`);
    const json = await res.json();
    const all = json.data || json;

    availableJobs = all.filter(j => j.status === "available");

    acceptedJobs = all.filter(j =>
      j.status === "accepted" &&
      j.traveler === window.travelerId
    );

    pickedUpJobs = all.filter(j =>
      j.status === "picked_up" &&
      j.traveler === window.travelerId
    );

    completedJobs = all.filter(j =>
      j.status === "delivered" &&
      j.traveler === window.travelerId
    );

    refreshJobs();
  } catch (err) {
    console.error("Error loading jobs:", err);
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

// Compute real driving miles safely
async function computeMiles(pickup, dropoff) {
  return new Promise(resolve => {
    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
      console.warn("Skipping computeMiles — missing coordinates");
      return resolve(0);
    }

    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [{ lat: pickup.lat, lng: pickup.lng }],
        destinations: [{ lat: dropoff.lat, lng: dropoff.lng }],
        travelMode: "DRIVING"
      },
      (res, status) => {
        if (status !== "OK") return resolve(0);

        const meters = res.rows[0].elements[0].distance.value;
        resolve(meters / 1609.34);
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

    // Enrich jobs
    await Promise.all(
      availableJobs.map(async (job) => {
        job.realMiles = await computeMiles(job.pickup, job.dropoff);
        job.payout = calculatePayout(job, job.realMiles);
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
   EARNINGS
   ============================================================ */
function refreshEarnings() {
  const earningsEl = document.getElementById("earningsValue");
  if (!earningsEl) return;

  const total = completedJobs.reduce((sum, job) => {
    const price = Number(job.price || 0);
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  earningsEl.textContent = `$${total.toFixed(2)}`;
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
   JOB CARD RENDERING — TRAVELER VERSION (UPDATED + FIXED)
============================================================ */
function renderJobCard(job, status, listElement) {
  if (!listElement) return;

  console.log("JOB OBJECT:", job);

  const card = document.createElement("div");
  card.className = "job-card";

  const deliveryId =
    job.deliveryId ||
    job.delivery?._id ||
    job.id ||
    job._id;

  const miles =
    job.realMiles ??
    job.distanceMiles ??
    job.distance ??
    ((job._distance?.pickupStartMiles || 0) +
     (job._distance?.dropoffDestMiles || 0));

  const payout =
    job.payout != null ? Number(job.payout).toFixed(2) : "0.00";

  const badgeColor =
    miles < 10 ? "green" :
    miles < 50 ? "orange" :
    "red";

  card.innerHTML = `
    <div class="job-header">
      <span class="badge badge-${badgeColor}">
        ${miles.toFixed(1)} mi
      </span>
      <button class="details-btn" data-id="${deliveryId}">View Details</button>
    </div>

    <div class="job-row">
      <div class="job-label"><span class="icon-pin pickup"></span> Pickup:</div>
      <div class="job-value">${job.pickupAddress || job.pickup?.address || "—"}</div>
    </div>

    <div class="job-row">
      <div class="job-label"><span class="icon-pin dropoff"></span> Dropoff:</div>
      <div class="job-value">${job.dropoffAddress || job.dropoff?.address || "—"}</div>
    </div>

    <div class="job-row">
      <div class="job-label"><span class="icon-money"></span> Payout:</div>
      <div class="job-value">$${payout}</div>
    </div>

    <div class="job-actions">
      ${status === "available" ? `
        <button class="primary-btn accept-btn" data-id="${deliveryId}">Accept</button>
        <button class="secondary-btn decline-btn" data-id="${deliveryId}">Decline</button>
      ` : ""}

      ${status === "accepted" ? `
        <button class="primary-btn pickup-btn" data-id="${deliveryId}">Pick Up</button>
      ` : ""}

      ${status === "picked_up" ? `
        <button class="primary-btn complete-delivery-btn" data-id="${deliveryId}">Complete Delivery</button>
        <button class="primary-btn proof-btn" data-id="${deliveryId}">Proof of Delivery</button>
        <button class="status-btn delivered-btn primary-btn hidden" data-id="${deliveryId}">Delivered</button>
      ` : ""}

      ${status === "completed" ? `
        <div class="completed-tag">Completed</div>
      ` : ""}
    </div>

    <div class="delivery-photo-section hidden">
<label class="form-label">Signed By</label>
<input 
  type="text" 
  id="receiverNameInput"
  class="input-shell"
  placeholder="Who signed for the delivery?"
/>

      <button class="primary-btn delivered-btn" style="margin-top:0.8rem;">
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
    card.querySelector(".pickup-btn").addEventListener("click", () => pickupJob(deliveryId));
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

  if (detailsBtn) {
    if (status === "available") {
      detailsBtn.addEventListener("click", () => openJobDetailsModal(job));
    } else {
      detailsBtn.addEventListener("click", () => {
        openTravelerDetails(job);

        if (status === "picked_up") {
          const proofSection = document.querySelector(".delivery-photo-section");
          if (proofSection) proofSection.classList.remove("hidden");
        }
      });
    }
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

  // Photo
  const photo = panel.querySelector(".item-photo");
  if (job.package?.photoUrl) {
    photo.src = job.package.photoUrl;
    photo.style.display = "block";
  } else {
    photo.style.display = "none";
  }

  // STATUS BUTTONS
  panel.querySelector(".pickup-btn").onclick = () => pickupJob(job._id);
  panel.querySelector(".dropoff-btn").onclick = () => onMyWayDropoff(job._id);
  panel.querySelector(".delivered-btn").onclick = () => completeJob(job._id);
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

/* ============================================================
   REAL-TIME JOB UPDATES (DELIVERY-SPECIFIC WEBSOCKET)
   ============================================================ */
let wsUpdateTimeout = null;


function initJobSocket(deliveryId) {
  if (!deliveryId) {
    console.warn("❗ initJobSocket called without deliveryId");
    return;
  }

  try {
    // CONNECT TO ROOT WEBSOCKET SERVER (NOT /ws/delivery/:id)
    ws = new WebSocket("wss://flexago-backend.onrender.com");

    ws.addEventListener("open", () => {
      console.log("🟢 WebSocket connected for delivery:", deliveryId);

      // JOIN DELIVERY ROOM (backend expects this message)
      ws.send(JSON.stringify({
        type: "joinDelivery",
        deliveryId
      }));
    });

    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("WS MESSAGE:", msg);

        if (
          msg.type === "job_update" ||
          msg.type === "job_completed" ||
          msg.type === "new_job"
        ) {
          clearTimeout(wsUpdateTimeout);

          wsUpdateTimeout = setTimeout(() => {
            if (!isSearching) {
              loadAvailableJobs();   // Debounced refresh
            }
          }, 300);
        }

      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.addEventListener("close", () => {
      console.warn("🔴 Job WebSocket closed — reconnecting in 3s");
      setTimeout(() => initJobSocket(deliveryId), 3000);
    });

  } catch (err) {
    console.error("initJobSocket failed:", err);
  }
}

/* ============================================================
   CHAT WIDGET
   ============================================================ */
function initChatWidget() {
  const toggleBtn = document.getElementById("chatToggleBtn");
  const bubble = document.getElementById("chatBubble");
  const closeBtn = document.getElementById("chatCloseBtn");
  const sendBtn = document.getElementById("chatSendBtn");
  const input = document.getElementById("chatInput");
  const body = document.getElementById("chatBody");

  if (!toggleBtn || !bubble || !closeBtn || !sendBtn || !input || !body) return;

  toggleBtn.addEventListener("click", () => {
    bubble.classList.toggle("open");
  });

  closeBtn.addEventListener("click", () => {
    bubble.classList.remove("open");
  });

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;

    appendChatMessage(body, text, "user");
    input.value = "";

    appendChatMessage(
      body,
      "Thanks! A support agent will review your delivery details shortly.",
      "system"
    );
  });
}

function appendChatMessage(container, text, type) {
  const div = document.createElement("div");
  div.style.marginBottom = "0.35rem";
  div.style.fontSize = "0.75rem";
  div.style.color = type === "user" ? "#e5e7eb" : "#9ca3af";
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
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
   TRAVELER ID LOADING — FINAL VERSION (WITH JOB LOADING)
   ============================================================ */
async function loadTravelerIdentity() {
  try {
    if (!window.userId) {
      console.warn("No userId on window — cannot load traveler");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/traveler/user/${window.userId}`);
    if (!res.ok) {
      console.warn("Failed to load traveler for user:", window.userId);
      return;
    }

    const traveler = await res.json();
    window.travelerId = traveler._id;
    console.log("Traveler ID loaded:", window.travelerId);

    /* ============================================================
       LOAD TRAVELER PROFILE INTO UI (NO FALLBACK "T")
       ============================================================ */

    // Full name
    const fullName = `${traveler.firstName || ""} ${traveler.lastName || ""}`.trim();
    if (fullName.length > 0) {
      document.getElementById("profileFullName").textContent = fullName;
    }

    // Inputs
    document.getElementById("firstNameInput").value = traveler.firstName || "";
    document.getElementById("lastNameInput").value = traveler.lastName || "";
    document.getElementById("emailInput").value = traveler.email || "";
    document.getElementById("phoneInput").value = traveler.phone || "";

    // DOB
    if (traveler.dob) {
      document.getElementById("dobInput").value = traveler.dob.split("T")[0];
    }

    // Photo
    if (traveler.photoUrl) {
      document.getElementById("profilePhotoPreview").src = traveler.photoUrl;
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
   PAGE SWITCHING (FINAL)
   ============================================================ */
function loadPage(view) {
  const main = document.getElementById("mainContentArea");
  const jobsLayout = document.getElementById("jobsLayout");
  if (!main || !jobsLayout) return;

if (view === "jobs") {
  jobsLayout.style.display = "block";
  main.style.display = "none";

  setTimeout(() => {
    safe(initTravelerMap);
    safe(initTravelerAutocomplete);   // ⭐ REQUIRED FIX
    safe(initRoutePlanner);
    safe(initJobsTabs);
  }, 50);

  return;
}

  jobsLayout.style.display = "none";
  main.style.display = "block";

  if (view === "account") {
    main.innerHTML = document.getElementById("template-account").innerHTML;
    setTimeout(() => initAccountPage(), 20);
  } else if (view === "verification") {
    main.innerHTML = document.getElementById("template-verification").innerHTML;
    setTimeout(() => initVerificationPage(), 20);
  } else if (view === "payments") {
    main.innerHTML = document.getElementById("template-payments").innerHTML;
    setTimeout(() => initPayoutsPage(), 20);
  } else if (view === "support") {
    main.innerHTML = "";
    const panel = document.getElementById("supportPanel");
    panel?.classList.remove("hidden");
    setTimeout(() => initSupportPage(), 20);
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

  attach();   // ⭐ THIS LINE WAS MISSING
}

/* ============================================================
   FINAL DOM READY BOOTSTRAP (FINAL)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  safe(loadTravelerIdentity);   // MUST RUN FIRST — this now calls loadJobs() internally

  safe(initTravelerMap);
  safe(initTravelerSidebar);
  safe(initChatWidget);
  //*safe(initJobSocket);//
  safe(initJobDetailsModal);
  safe(initRoutePlanner);

  // ❌ REMOVE safe(loadJobs) — loadJobs() is now called inside loadTravelerIdentity()

  loadPage("jobs");
  safe(initJobSearch);
});