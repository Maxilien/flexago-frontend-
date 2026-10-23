

/* ============================================================
   AUTH GUARD â€” SENDER ONLY
   ============================================================ */

const user = JSON.parse(localStorage.getItem("user"));

// 1. Must be logged in
if (!user) {
  window.location.href = "login.html";
}

// 2. Must be a sender
if (user.role !== "sender") {
  window.location.href = "login.html";
}

// â­ CORRECT â€” load senderId from the actual user object
window.senderId = user._id;
window.senderEmail = user.email;

console.log("SenderId loaded:", window.senderId);

// 3. Must have senderId
if (!window.senderId) {
  alert("Error: Sender ID missing. Please log in again.");
  window.location.href = "login.html";
}

/* ============================================================
   FLEXAGO SENDER â€” GLOBAL STATE
   ============================================================ */

let senderDirectionsService = null;
let senderDirectionsRenderer = null;
let senderMap = null;

// Custom markers
let pickupMarker = null;
let dropoffMarker = null;

/* ============================================================
   BASE URL + SOCKET
   ============================================================ */

const BASE_URL = "https://flexago-backend.onrender.com";
const WS_URL = "wss://flexago-backend.onrender.com";

const DELIVERY_CHAT_WS_URL =
  "wss://flexago-backend.onrender.com/ws";

const socket = io(WS_URL, {
  path: "/socket.io",
  transports: ["websocket"]
});

/* ============================================================
   SAFE STRIPE.JS LOADER
============================================================ */

let stripeScriptPromise = null;

function loadStripeScript() {
  if (window.Stripe) {
    return Promise.resolve(window.Stripe);
  }

  if (stripeScriptPromise) {
    return stripeScriptPromise;
  }

  stripeScriptPromise = new Promise((resolve, reject) => {
    const existingScript =
      document.getElementById("flexagoStripeScript");

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.Stripe) {
          resolve(window.Stripe);
        } else {
          reject(
            new Error("Stripe.js loaded but Stripe is unavailable.")
          );
        }
      });

      existingScript.addEventListener("error", () => {
        reject(new Error("Unable to load Stripe.js."));
      });

      return;
    }

    const script =
      document.createElement("script");

    script.id = "flexagoStripeScript";

    script.src =
      "https:" + "//js.stripe.com/v3/";

    script.async = true;

    script.onload = () => {
      if (window.Stripe) {
        console.log("Stripe.js loaded successfully");
        resolve(window.Stripe);
      } else {
        reject(
          new Error("Stripe.js loaded but Stripe is unavailable.")
        );
      }
    };

    script.onerror = () => {
      reject(new Error("Unable to load Stripe.js."));
    };

    document.head.appendChild(script);
  });

  return stripeScriptPromise;
}
/* ============================================================
   SENDER STRIPE PAYMENT ELEMENT
============================================================ */

let senderStripe = null;
let senderStripeElements = null;
let senderCardElement = null;
let senderCardMounted = false;

async function initializeSenderStripePayment() {
  if (senderCardMounted) {
    return;
  }

  const cardContainer =
    document.getElementById("card-element");

  if (!cardContainer) {
    throw new Error(
      "Stripe card container was not found."
    );
  }

  await loadStripeScript();

  if (!window.Stripe) {
    throw new Error(
      "Stripe.js is unavailable."
    );
  }

  senderStripe = window.Stripe(
    "pk_test_51TtZ6fJgbApUnpicUnhLPQwXPT8hRJK5BFix4gLJUcpmlHzfqK6HIWBzW3i5qbORh6c7nGqpAhTME6a3eej5rf7E00szc8T2WX"
  );

  senderStripeElements =
    senderStripe.elements();

  senderCardElement =
    senderStripeElements.create(
      "card",
      {
        style: {
          base: {
            color: "#111827",
            fontFamily: "Arial, sans-serif",
            fontSize: "16px",

            "::placeholder": {
              color: "#6b7280"
            }
          },

          invalid: {
            color: "#dc2626"
          }
        }
      }
    );

  senderCardElement.mount(
    "#card-element"
  );

  senderCardElement.on(
    "change",
    event => {
      const errorDisplay =
        document.getElementById(
          "card-errors"
        );

      if (!errorDisplay) {
        return;
      }

      errorDisplay.textContent =
        event.error
          ? event.error.message
          : "";
    }
  );

  senderCardMounted = true;

  console.log(
    "Stripe Card Element mounted successfully"
  );
}
/* ============================================================
   WAIT FOR DELIVERY PAYMENT CONFIRMATION
============================================================ */

async function waitForDeliveryPaymentConfirmation(
  deliveryId,
  options = {}
) {
  const maxAttempts =
    Number(options.maxAttempts) || 20;

  const delayMs =
    Number(options.delayMs) || 1500;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    const response = await fetch(
      `${BASE_URL}/api/payments/delivery/${deliveryId}/status`
    );

    const responseText =
      await response.text();

    let result = {};

    if (responseText) {
      try {
        result =
          JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(
          `Payment status returned an invalid response. Status: ${response.status}`
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
        `Unable to verify payment. Status: ${response.status}`
      );
    }

    console.log(
      `Payment status check ${attempt}:`,
      result
    );

    if (
      result.paymentStatus === "paid" &&
      result.deliveryStatus === "available"
    ) {
      return result;
    }

    if (
      result.paymentStatus === "failed" ||
      result.deliveryStatus === "payment_failed"
    ) {
      throw new Error(
        "The delivery payment failed."
      );
    }

    await new Promise(resolve => {
      setTimeout(resolve, delayMs);
    });
  }

  throw new Error(
    "Payment was submitted, but confirmation is taking longer than expected. Please check the delivery status before trying again."
  );
}
/* ============================================================
   SENDER PAYMENT CONFIRMATION
============================================================ */

function initSenderPaymentConfirmation() {
  const confirmPaymentBtn =
    document.getElementById("confirmPaymentBtn");

  if (!confirmPaymentBtn) {
    console.error("confirmPaymentBtn not found");
    return;
  }

  if (
    confirmPaymentBtn.dataset.paymentBound === "true"
  ) {
    return;
  }

  confirmPaymentBtn.dataset.paymentBound = "true";

  confirmPaymentBtn.addEventListener(
    "click",
    async () => {
      const originalButtonText =
        confirmPaymentBtn.textContent;

      const cardErrors =
        document.getElementById("card-errors");

      try {
        if (cardErrors) {
          cardErrors.textContent = "";
        }

        if (!window.activeDeliveryId) {
          throw new Error(
            "Delivery ID is missing. Please create the delivery again."
          );
        }

        if (!window.senderId) {
          throw new Error(
            "Sender ID is missing. Please log in again."
          );
        }

        if (
          !senderStripe ||
          !senderCardElement ||
          !senderCardMounted
        ) {
          await initializeSenderStripePayment();
        }

        if (
          !senderStripe ||
          !senderCardElement
        ) {
          throw new Error(
            "The secure payment form is unavailable."
          );
        }

        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.textContent =
          "Preparing payment...";

        const paymentResponse =
          await fetch(
            `${BASE_URL}/api/payments/create-delivery-payment`,
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json"
              },

              body: JSON.stringify({
                deliveryId:
                  window.activeDeliveryId,

                senderId:
                  window.senderId
              })
            }
          );

        const paymentResponseText =
          await paymentResponse.text();

        let paymentResult = {};

        if (paymentResponseText) {
          try {
            paymentResult =
              JSON.parse(paymentResponseText);
          } catch (parseError) {
            throw new Error(
              `Payment endpoint returned an invalid response. Status: ${paymentResponse.status}`
            );
          }
        }

        console.log(
          "Create delivery payment response:",
          paymentResult
        );

        if (
          !paymentResponse.ok ||
          !paymentResult.success
        ) {
          throw new Error(
            paymentResult.error ||
            `Unable to prepare payment. Status: ${paymentResponse.status}`
          );
        }

        if (!paymentResult.clientSecret) {
          throw new Error(
            "The backend did not return a PaymentIntent client secret."
          );
        }

        if (
          paymentResult.paymentStatus === "succeeded"
        ) {
          confirmPaymentBtn.textContent =
            "Verifying payment...";
        } else {
          confirmPaymentBtn.textContent =
            "Processing payment...";

          const senderName =
            document
              .getElementById("senderName")
              ?.value.trim() || "";

          const senderEmail =
            document
              .getElementById("senderEmail")
              ?.value.trim() || "";

          const confirmationResult =
            await senderStripe.confirmCardPayment(
              paymentResult.clientSecret,
              {
                payment_method: {
                  card: senderCardElement,

                  billing_details: {
                    name:
                      senderName ||
                      undefined,

                    email:
                      senderEmail ||
                      undefined
                  }
                }
              }
            );

          if (confirmationResult.error) {
            throw new Error(
              confirmationResult.error.message ||
              "Stripe could not confirm the payment."
            );
          }

          const paymentIntent =
            confirmationResult.paymentIntent;

          if (!paymentIntent) {
            throw new Error(
              "Stripe did not return a PaymentIntent."
            );
          }

          console.log(
            "Stripe payment confirmation:",
            paymentIntent
          );

          if (
            paymentIntent.status !== "succeeded" &&
            paymentIntent.status !== "processing"
          ) {
            throw new Error(
              `Payment requires additional processing. Stripe status: ${paymentIntent.status}`
            );
          }

          confirmPaymentBtn.textContent =
            "Verifying payment...";
        }

        const fundedDelivery =
          await waitForDeliveryPaymentConfirmation(
            window.activeDeliveryId
          );

        console.log(
          "Delivery payment funded:",
          fundedDelivery
        );

        const paymentSection =
          document.getElementById(
            "paymentSection"
          );

        const createView =
          document.getElementById(
            "createView"
          );

        const waitingSection =
          document.getElementById(
            "waiting-section"
          );

        if (paymentSection) {
          paymentSection.classList.add(
            "hidden"
          );
        }

        if (createView) {
          createView.classList.add(
            "hidden"
          );
        }

        if (waitingSection) {
          waitingSection.style.display =
            "block";
        }

        if (
          typeof subscribeToDeliveryUpdates ===
          "function"
        ) {
          subscribeToDeliveryUpdates(
            window.activeDeliveryId
          );
        }

        confirmPaymentBtn.textContent =
          "Payment Complete";

        alert(
          "Payment confirmed. Your delivery is now published and available to travelers."
        );
      } catch (error) {
        console.error(
          "Pay and Publish failed:",
          error
        );

        if (cardErrors) {
          cardErrors.textContent =
            error.message ||
            "Unable to complete payment.";
        }

        alert(
          error.message ||
          "Unable to complete payment."
        );

        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.textContent =
          originalButtonText;
      }
    }
  );
}
/* ============================================================
   SAFE WRAPPER
   ============================================================ */
function safe(fn) {
  try {
    fn();
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================
   SIDEBAR SWITCHING (UPDATED FOR NEW VIEWS)
============================================================ */
function initSenderSidebar() {
  const items = document.querySelectorAll(".sidebar-item");

  items.forEach(btn => {
    btn.addEventListener("click", () => {
      // highlight active
      items.forEach(i => i.classList.remove("active"));
      btn.classList.add("active");

      const view = btn.getAttribute("data-view");

      switch (view) {
        case "account":
          showSenderView("accountView");
          break;

        case "create":
          showSenderView("createView");
          break;

        case "myDeliveries":
          hideAllPanels();
          document.getElementById("myDeliveriesView").classList.remove("hidden");
          loadSenderDeliveries();
          break;

        case "deliveryStatus":
          showSenderView("deliveryStatusView");
          break;

        case "payments":
          showSenderView("paymentsView");
          break;

        case "verification":
          showSenderView("verificationView");
          break;

        case "support":
          showSenderView("supportView");
          break;

        default:
          console.warn("Unknown view:", view);
      }

      window.scrollTo(0, 0);
    });
  });
}
/* ============================================================
   SHOW VIEW (SECTION-BASED)
   ============================================================ */
function showSenderView(viewId) {
  // hide all views
  const views = document.querySelectorAll("section[id$='View']");
  views.forEach(v => v.classList.add("hidden"));

  // show selected view
  const target = document.getElementById(viewId);
  if (target) target.classList.remove("hidden");

  // re-init icons
  safe(initSenderIcons);

  // re-init map AFTER createView becomes visible
  if (viewId === "createView") {
    setTimeout(() => {
      safe(initSenderMap);
    }, 150);
  }
}
/* ============================================================
   HIDE ALL SENDER PANELS
============================================================ */
function hideAllPanels() {
  const panels = document.querySelectorAll('section[id$="View"]');
  panels.forEach(p => p.classList.add("hidden"));
}

/* ============================================================
   ICON REFRESH
   ============================================================ */
function initSenderIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

/* ============================================================
   OPTIONAL: LOAD SENDER IDENTITY
   ============================================================ */
async function loadSenderIdentity() {
  try {
    if (!window.userId) return;

    const res = await fetch(`${BASE_URL}/api/sender/user/${window.userId}`);
    if (!res.ok) return;

    const sender = await res.json();
    window.senderId = sender._id;
  } catch (err) {
    console.error("Error loading sender identity:", err);
  }
}

/* ============================================================
   CREATE DELIVERY INITIALIZER
   ============================================================ */
function initSenderCreateForm() {
  // Initialize map AFTER view is visible
  safe(initSenderMap);
}

/* ============================================================
   MAP + ROUTE
   ============================================================ */
function initSenderMap() {
  const mapElement = document.getElementById("mapContainer");
  if (!mapElement || !window.google || !google.maps) return;

  // Prevent multiple map instances
  if (!senderMap) {
    senderMap = new google.maps.Map(mapElement, {
      center: { lat: 30.2672, lng: -97.7431 },
      zoom: 8,
      disableDefaultUI: true
    });

    senderDirectionsService = new google.maps.DirectionsService();
    senderDirectionsRenderer = new google.maps.DirectionsRenderer({
      map: senderMap,
      suppressMarkers: false
    });

    initSenderAutocomplete(senderMap);
  }
}

function drawSenderRoute() {
  const pickupLat = parseFloat(document.getElementById("pickup-lat").value);
  const pickupLng = parseFloat(document.getElementById("pickup-lng").value);
  const dropLat = parseFloat(document.getElementById("dropoff-lat").value);
  const dropLng = parseFloat(document.getElementById("dropoff-lng").value);

  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropLat) ||
    !Number.isFinite(dropLng)
  ) return;

  if (!senderDirectionsService || !senderDirectionsRenderer || !window.google || !google.maps) return;

  const request = {
    origin: { lat: pickupLat, lng: pickupLng },
    destination: { lat: dropLat, lng: dropLng },
    travelMode: google.maps.TravelMode.DRIVING
  };

  senderDirectionsService.route(request, (result, status) => {
    if (status === "OK" && result.routes && result.routes[0] && result.routes[0].legs[0]) {
      senderDirectionsRenderer.setDirections(result);

      const distanceMeters = result.routes[0].legs[0].distance.value;
      const distanceMiles = distanceMeters / 1609.34;

      updateEstimateUI(distanceMiles);
    }
  });
}

/* ============================================================
   AUTOCOMPLETE
   ============================================================ */
function initSenderAutocomplete(map) {
  const pickupInput = document.getElementById("pickupInput");
  const dropoffInput = document.getElementById("dropoffInput");

  const pickupDropdown = document.getElementById("senderPickupAutocomplete");
  const dropoffDropdown = document.getElementById("senderDropoffAutocomplete");

  if (!pickupInput || !dropoffInput || !pickupDropdown || !dropoffDropdown) return;
  if (!window.google || !google.maps || !google.maps.places) return;

  const service = new google.maps.places.AutocompleteService();
  const geocoder = new google.maps.Geocoder();

  function attachAutocomplete(input, dropdown, latField, lngField, isPickup) {
    input.addEventListener("input", () => {
      const query = input.value.trim();
      if (query.length < 3) {
        dropdown.classList.add("hidden");
        dropdown.innerHTML = "";
        return;
      }

      service.getPlacePredictions(
        { input: query, types: ["address"] },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            dropdown.classList.add("hidden");
            dropdown.innerHTML = "";
            return;
          }

          dropdown.innerHTML = "";
          dropdown.classList.remove("hidden");

          predictions.forEach(pred => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = pred.description;

            item.addEventListener("click", () => {
              input.value = pred.description;
              dropdown.classList.add("hidden");
              dropdown.innerHTML = "";

              geocoder.geocode({ placeId: pred.place_id }, (results, status) => {
                if (status === "OK" && results[0]) {
                  const loc = results[0].geometry.location;

                  const lat = loc.lat();
                  const lng = loc.lng();

                  document.getElementById(latField).value = lat;
                  document.getElementById(lngField).value = lng;

                  if (isPickup) {
                    window.pickupData = { address: input.value, lat, lng };
                  } else {
                    window.dropoffData = { address: input.value, lat, lng };
                  }

                  map.setCenter(loc);
                  map.setZoom(13);

                  // Custom markers: Pickup = red P, Dropoff = blue D
                  if (isPickup) {
                    if (pickupMarker) pickupMarker.setMap(null);
                    pickupMarker = new google.maps.Marker({
                      position: loc,
                      map,
                      label: {
                        text: "P",
                        color: "white",
                        fontWeight: "bold"
                      },
                      icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#ef4444", // red
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "white"
                      }
                    });
                  } else {
                    if (dropoffMarker) dropoffMarker.setMap(null);
                    dropoffMarker = new google.maps.Marker({
                      position: loc,
                      map,
                      label: {
                        text: "D",
                        color: "white",
                        fontWeight: "bold"
                      },
                      icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#3b82f6", // blue
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "white"
                      }
                    });
                  }

                  drawSenderRoute();
                }
              });
            });

            dropdown.appendChild(item);
          });
        }
      );
    });
  }

  attachAutocomplete(pickupInput, pickupDropdown, "pickup-lat", "pickup-lng", true);
  attachAutocomplete(dropoffInput, dropoffDropdown, "dropoff-lat", "dropoff-lng", false);
}
// ============================================================
// FLEXAGO PRICING ENGINE
//
// Total =
// distance
// + declared value
// + weight
// + size
// + package type
// + insurance
// ============================================================

function calculateEstimatedCost({
  deliveryType,
  distanceMiles,
  weight,
  declaredValue,
  packageType,
  size,
  insuranceType
}) {
  const safeDistance =
    Number.isFinite(Number(distanceMiles))
      ? Math.max(0, Number(distanceMiles))
      : 0;

  const safeWeight =
    Number.isFinite(Number(weight))
      ? Math.max(0, Number(weight))
      : 0;

  const safeDeclaredValue =
    Number.isFinite(Number(declaredValue))
      ? Math.max(0, Number(declaredValue))
      : 0;

  /* ==========================================================
     1. DISTANCE PRICE
  ========================================================== */

  let distanceFee = 0;

  if (deliveryType === "local") {
    distanceFee =
      safeDistance * 0.75;
  }

  if (deliveryType === "nationwide") {
    distanceFee =
      50 + safeDistance * 0.50;
  }

  if (deliveryType === "international") {
    distanceFee =
      200 + safeDistance * 0.25;
  }

  /* ==========================================================
     2. DECLARED VALUE FEE

     1% of declared value
     Maximum $20
  ========================================================== */

  const declaredValueFee =
    Math.min(
      safeDeclaredValue * 0.01,
      20
    );

  /* ==========================================================
     3. WEIGHT FEE
  ========================================================== */

  let weightFee = 0;

  if (
    safeWeight > 10 &&
    safeWeight <= 25
  ) {
    weightFee = 2;
  } else if (
    safeWeight > 25 &&
    safeWeight <= 50
  ) {
    weightFee = 5;
  } else if (
    safeWeight > 50
  ) {
    weightFee = 10;
  }

  /* ==========================================================
     4. SIZE FEE
  ========================================================== */

  const sizeFees = {
    small: 0,
    medium: 2,
    large: 5
  };

  const sizeFee =
    sizeFees[size] ?? 0;

  /* ==========================================================
     5. PACKAGE TYPE FEE
  ========================================================== */

  const packageTypeFees = {
    envelope: 0,
    documents: 0,
    small_box: 1,
    medium_box: 2,
    large_box: 4,
    bag: 2,
    fragile: 5,
    electronics: 5,
    other: 2
  };

  const packageTypeFee =
    packageTypeFees[packageType] ?? 0;

  /* ==========================================================
     6. INSURANCE FEE

     This is added last.
  ========================================================== */

  let insuranceFee = 0;

  if (insuranceType === "basic") {
    insuranceFee =
      Math.min(
        Math.max(
          safeDeclaredValue * 0.03,
          2
        ),
        10
      );
  }

  if (insuranceType === "premium") {
    insuranceFee =
      Math.min(
        Math.max(
          safeDeclaredValue * 0.05,
          5
        ),
        50
      );
  }

  /* ==========================================================
     FINAL TOTAL
  ========================================================== */

  const total =
    distanceFee +
    declaredValueFee +
    weightFee +
    sizeFee +
    packageTypeFee +
    insuranceFee;

  return {
    distanceFee,
    declaredValueFee,
    weightFee,
    sizeFee,
    packageTypeFee,
    insuranceFee,
    total:
      Math.round(total * 100) / 100
  };
}

// ============================================================
// UPDATE ESTIMATE UI
// ============================================================

function updateEstimateUI(
  newDistanceMiles = null
) {
  const deliveryTypeEl =
    document.getElementById(
      "deliveryType"
    );

  const insuranceEl =
    document.getElementById(
      "insuranceType"
    );

  const weightEl =
    document.getElementById(
      "weightInput"
    );

  const valueEl =
    document.getElementById(
      "valueInput"
    );

  const packageTypeEl =
    document.getElementById(
      "packageType"
    );

  const estimateEl =
    document.getElementById(
      "estimateValue"
    );

  if (
    !deliveryTypeEl ||
    !insuranceEl ||
    !weightEl ||
    !valueEl ||
    !packageTypeEl ||
    !estimateEl
  ) {
    console.warn(
      "Pricing fields are missing."
    );

    return;
  }

  /*
   * Only replace cached mileage when a valid
   * distance is explicitly provided.
   */
  if (
    newDistanceMiles !== null &&
    newDistanceMiles !== undefined &&
    Number.isFinite(
      Number(newDistanceMiles)
    )
  ) {
    window.currentDistanceMiles =
      Math.max(
        0,
        Number(newDistanceMiles)
      );
  }

  const distanceMiles =
    Number(
      window.currentDistanceMiles
    ) || 0;

  const pricing =
    calculateEstimatedCost({
      deliveryType:
        deliveryTypeEl.value,

      distanceMiles,

      weight:
        parseFloat(
          weightEl.value
        ) || 0,

      declaredValue:
        parseFloat(
          valueEl.value
        ) || 0,

      packageType:
        packageTypeEl.value,

      size:
        window.selectedSize ||
        "small",

      insuranceType:
        insuranceEl.value
    });

  estimateEl.textContent =
    `$${pricing.total.toFixed(2)}`;

  window.currentPrice =
    pricing.total;

  window.currentPriceBreakdown =
    pricing;

  console.log(
    "Flexago price breakdown:",
    pricing
  );
}

// ============================================================
// INSURANCE HELPER
// ============================================================

function getInsuranceBoolean() {
  const insuranceEl =
    document.getElementById(
      "insuranceType"
    );

  if (!insuranceEl) {
    return false;
  }

  return (
    insuranceEl.value === "basic" ||
    insuranceEl.value === "premium"
  );
}

// ============================================================
// STANDARD INPUT LISTENERS
// ============================================================

[
  "deliveryType",
  "insuranceType",
  "weightInput",
  "valueInput",
  "packageType"
].forEach(id => {
  const element =
    document.getElementById(id);

  if (!element) {
    return;
  }

  const recalculatePrice = () => {
    /*
     * Do not pass 0 here.
     * Reuse the existing cached mileage.
     */
    updateEstimateUI();
  };

  element.addEventListener(
    "change",
    recalculatePrice
  );

  element.addEventListener(
    "input",
    recalculatePrice
  );
});
/* ======================== SIZE SELECTOR ======================== */

window.selectedSize = "small";

document
  .querySelectorAll("#sizePills .pill")
  .forEach(btn => {

    btn.addEventListener("click", () => {

      document
        .querySelectorAll("#sizePills .pill")
        .forEach(pill =>
          pill.classList.remove("active")
        );

      btn.classList.add("active");

      window.selectedSize =
        btn.dataset.value;

      console.log(
        "Selected Size:",
        window.selectedSize
      );

      updateEstimateUI();
    });

  });

window.getSelectedSize = () => {
  return window.selectedSize;
};

/* ============================================================
   PHOTO UPLOAD
   ============================================================ */
function initSenderPhotoUpload() {
  const photoInput = document.getElementById("photoInput");
  const photoUploadBtn = document.getElementById("photoUploadBtn");
  const photoPreview = document.getElementById("photoPreview");

  if (!photoInput || !photoUploadBtn || !photoPreview) return;

  photoUploadBtn.addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
      const reader = new FileReader();   // â­ REQUIRED

      reader.onload = e => {
        const base64 = e.target.result;

        // â­ Store globally so generateDelivery can access it
        window.uploadedPhotoBase64 = base64;

        // â­ Update preview
        photoPreview.src = base64;
        photoPreview.style.display = "block";
      };

      reader.readAsDataURL(file);
    }
  });
}

function initSenderAccountView() {
  const uploadBtn = document.getElementById("senderProfilePhotoUploadBtn");
  const fileInput = document.getElementById("senderProfilePhotoInput");
  const preview = document.getElementById("senderProfilePhotoPreview");

  if (!uploadBtn || !fileInput || !preview) {
    console.warn("AccountView elements missing");
    return;
  }

  uploadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   GENERATE DELIVERY
============================================================ */

function initSenderGenerateDelivery() {
  const btn = document.getElementById("generate-matches-btn");

  if (!btn) {
    return;
  }

  if (!window.senderId) {
    window.senderId =
      window.user?._id ||
      window.user?.id;

    console.log(
      "SenderId initialized:",
      window.senderId
    );
  }

  btn.addEventListener("click", async () => {
    console.log("Generate button clicked");

    const pickupLat = Number(
      document.getElementById("pickup-lat")?.value
    );

    const pickupLng = Number(
      document.getElementById("pickup-lng")?.value
    );

    const dropoffLat = Number(
      document.getElementById("dropoff-lat")?.value
    );

    const dropoffLng = Number(
      document.getElementById("dropoff-lng")?.value
    );

    if (!window.pickupData) {
      window.pickupData = {
        address:
          document.getElementById("pickupInput")?.value.trim() || "",

        lat: pickupLat,
        lng: pickupLng
      };
    }

    if (!window.dropoffData) {
      window.dropoffData = {
        address:
          document.getElementById("dropoffInput")?.value.trim() || "",

        lat: dropoffLat,
        lng: dropoffLng
      };
    }

    const pickup = window.pickupData;
    const dropoff = window.dropoffData;

    if (
      !Number.isFinite(pickup?.lat) ||
      !Number.isFinite(pickup?.lng) ||
      !Number.isFinite(dropoff?.lat) ||
      !Number.isFinite(dropoff?.lng)
    ) {
      alert(
        "Pickup and dropoff must have valid coordinates."
      );

      return;
    }

    const weight =
      document.getElementById("weightInput")?.value;

    const deliveryType =
      document.getElementById("deliveryType")?.value;

    const packageType =
      document.getElementById("packageType")?.value;

    const insurance =
      getInsuranceBoolean();

    const senderName =
      document.getElementById("senderName")?.value.trim();

    const senderPhone =
      document.getElementById("senderPhone")?.value.trim();

    const senderEmail =
      document.getElementById("senderEmail")?.value.trim();

    const receiverName =
      document.getElementById("receiverName")?.value.trim();

    const receiverPhone =
      document.getElementById("receiverPhone")?.value.trim();

    const receiverEmail =
      document.getElementById("receiverEmail")?.value.trim();

    const receiverAddress =
      document.getElementById("receiverAddress")?.value.trim();

    const receiverInstructions =
      document.getElementById("receiverInstructions")?.value.trim();

    const notes =
      document.getElementById("notesInput")?.value.trim();

    if (
      !senderName ||
      !senderPhone ||
      !senderEmail
    ) {
      alert("Please complete all sender fields.");
      return;
    }

    if (
      !receiverName ||
      !receiverPhone ||
      !receiverEmail ||
      !receiverAddress
    ) {
      alert("Please complete all receiver fields.");
      return;
    }

    if (!weight) {
      alert("Please enter package weight.");
      return;
    }

    if (!window.senderId) {
      alert(
        "Sender ID is missing. Please log in again."
      );

      return;
    }

    const estimatedPrice =
      Number(window.currentPrice);

    if (
      !Number.isFinite(estimatedPrice) ||
      estimatedPrice <= 0
    ) {
      alert(
        "Please calculate a valid delivery price before continuing."
      );

      return;
    }

    const photoUrl =
      window.uploadedPhotoBase64 || "";

    const deliveryData = {
      senderId: window.senderId,

      sender: {
        name: senderName,
        phone: senderPhone,
        email: senderEmail
      },

      pickup: {
        address: pickup.address,

        location: {
          type: "Point",
          coordinates: [
            Number(pickup.lng),
            Number(pickup.lat)
          ]
        }
      },

      dropoff: {
        address: dropoff.address,

        location: {
          type: "Point",
          coordinates: [
            Number(dropoff.lng),
            Number(dropoff.lat)
          ]
        },

        instructions:
          receiverInstructions || ""
      },

      package: {
        type: packageType,
        weight: Number(weight),
        size: window.getSelectedSize(),
        description:
          document.getElementById("itemDescription")?.value.trim() || "",

        declaredValue:
          Number(
            document.getElementById("valueInput")?.value
          ) || 0,

        photoUrl,
        insurance,
        deliveryType
      },

      receiver: {
        name: receiverName,
        phone: receiverPhone,
        email: receiverEmail,
        address: receiverAddress,
        instructions:
          receiverInstructions || ""
      },

      notes: notes || "",
      price: estimatedPrice
    };

    console.log(
      "FINAL DELIVERY PAYLOAD:",
      deliveryData
    );

    btn.disabled = true;
    btn.textContent = "Creating delivery...";

    try {
      const response = await fetch(
        `${BASE_URL}/api/deliveries`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(deliveryData)
        }
      );

      const responseText =
        await response.text();

      let result = {};

      if (responseText) {
        result = JSON.parse(responseText);
      }

      console.log(
        "Delivery creation response:",
        result
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          `Delivery creation failed with status ${response.status}`
        );
      }

      window.activeDeliveryId =
        result.data._id;

      window.pendingDelivery =
        result.data;

      const paymentSection =
        document.getElementById("paymentSection");

      const paymentAmountDisplay =
        document.getElementById(
          "paymentAmountDisplay"
        );

      if (paymentAmountDisplay) {
        paymentAmountDisplay.textContent =
          `$${estimatedPrice.toFixed(2)}`;
      }

if (paymentSection) {
  paymentSection.classList.remove("hidden");

  paymentSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  try {
    await initializeSenderStripePayment();
  } catch (stripeError) {
    console.error(
      "Stripe initialization failed:",
      stripeError
    );

    alert(
      stripeError.message ||
      "Unable to load secure payment form."
    );

    return;
  }
}

      alert(
        "Delivery created successfully. Please complete payment to publish the delivery."
      );
    } catch (error) {
      console.error(
        "Error generating delivery:",
        error
      );

      alert(
        error.message ||
        "Failed to create delivery."
      );
    } finally {
      btn.disabled = false;
      btn.textContent =
        "Generate traveler matches";

      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  });
}
/* ============================================================
   LOAD SENDER DELIVERIES (FINAL â€” matches your backend)
============================================================ */
async function loadSenderDeliveries() {
  try {
    const res = await fetch(`${BASE_URL}/api/deliveries`);
    const json = await res.json();

    if (!json.success) {
      console.error("Failed to load deliveries:", json.error);
      return;
    }

    const all = json.data;

    // Filter deliveries belonging to this sender
    const mine = all.filter(d => d.senderId === window.senderId);

    // â­ Your backend stores traveler under "traveler", NOT "travelerId"
    for (let d of mine) {
      if (d.traveler) {
        // traveler is already a string ID â€” but backend does NOT expose traveler API
        // so we cannot fetch traveler profile here
        // Instead, we attach the raw traveler ID
        d.travelerDetails = { id: d.traveler };
      }
    }

    renderMyDeliveries(mine);
  } catch (err) {
    console.error("Error loading sender deliveries:", err);
  }
}
/* ============================================================
 Delivery Status
============================================================ */
function formatDeliveryStatus(status) {
  switch (status) {
    case "created":
      return "Created";

    case "available":
      return "Available";

    case "accepted":
      return "Accepted";

    case "in_transit":
      return "In Transit";

    case "delivered":
    case "payout_pending":
    case "payout_completed":
      return "Delivered";

    default:
      return status || "Unknown";
  }
}
/* ============================================================
   SENDER DELIVERY RATING HELPERS
============================================================ */

function getSenderRatingIdentity() {
  return String(
    window.senderId ||
    user?._id ||
    localStorage.getItem("userId") ||
    ""
  ).trim();
}

function setDeliveryRatingButtonState(
  button,
  rating
) {
  if (!button) {
    return;
  }

  const score =
    Number(
      rating?.score || 0
    );

  button.disabled = true;

  button.classList.add(
    "sender-rating-completed"
  );

  button.textContent =
    score >= 1 && score <= 5
      ? `Rated ${score}/5`
      : "Already Rated";

  button.dataset.rated =
    "true";
}

async function loadDeliveryRatingState(
  deliveryId,
  button
) {
  const senderId =
    getSenderRatingIdentity();

  if (
    !deliveryId ||
    !senderId ||
    !button
  ) {
    return;
  }

  button.disabled = true;

  button.textContent =
    "Checking rating...";

  try {
    const response =
      await fetch(
        `${BASE_URL}/api/ratings/delivery/${deliveryId}`,
        {
          method: "GET",

          headers: {
            "x-user-id":
              senderId,

            "x-user-role":
              "sender"
          }
        }
      );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.error ||
        "Unable to check delivery rating."
      );
    }

    if (
      result.rated &&
      result.data
    ) {
      setDeliveryRatingButtonState(
        button,
        result.data
      );

      return;
    }

    button.disabled = false;

    button.textContent =
      "Rate Traveler";

    button.dataset.rated =
      "false";

  } catch (error) {
    console.error(
      "Unable to check delivery rating:",
      error
    );

    /*
     * Do not block rating submission if the
     * rating-state request temporarily fails.
     */
    button.disabled = false;

    button.textContent =
      "Rate Traveler";

    button.dataset.rated =
      "false";
  }
}

/* ============================================================
   RENDER DELIVERY LIST (with traveler details)
============================================================ */

function renderMyDeliveries(list) {
  const container =
    document.getElementById(
      "myDeliveriesList"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (
    !Array.isArray(list) ||
    list.length === 0
  ) {
    container.innerHTML =
      `<p class="empty-text">No deliveries found.</p>`;

    return;
  }

  list.forEach((delivery) => {
    const deliveryCard =
      document.createElement("div");

    deliveryCard.className =
      "delivery-card";

    let html = `
      <div class="delivery-row">
        <span>
          <strong>Item Description:</strong>
        </span>

        <span>
          ${delivery.package?.description || "Package"}
        </span>
      </div>

      <div class="delivery-row">
        <span>
          <strong>Status:</strong>
        </span>

        <span
          class="delivery-status status-${delivery.status}"
        >
          ${formatDeliveryStatus(delivery.status)}
        </span>
      </div>

      <div class="delivery-row">
        <span>Pickup:</span>

        <span>
          ${delivery.pickup?.address || "N/A"}
        </span>
      </div>

      <div class="delivery-row">
        <span>Dropoff:</span>

        <span>
          ${delivery.dropoff?.address || "N/A"}
        </span>
      </div>

      <div class="delivery-row">
        <span>Price:</span>

        <span>
          $${Number(delivery.price || 0).toFixed(2)}
        </span>
      </div>

      <div class="delivery-row">
        <span>Type:</span>

        <span>
          ${delivery.package?.deliveryType || "N/A"}
        </span>
      </div>

      <div class="delivery-row">
        <span>Insurance:</span>

        <span>
          ${delivery.package?.insurance ? "Yes" : "No"}
        </span>
      </div>
    `;

    /* ========================================================
       TRAVELER DETAILS
    ======================================================== */

    if (
      delivery.travelerDetails &&
      typeof delivery.travelerDetails ===
        "object"
    ) {
      const traveler =
        delivery.travelerDetails;

      const travelerName =
        `${
          traveler.firstName || ""
        } ${
          traveler.lastName || ""
        }`.trim() ||
        "Unassigned";

      const travelerRating =
        traveler.rating ??
        "N/A";

      html += `
        <div
          class="delivery-row traveler-info"
        >
          <span>
            <strong>Traveler:</strong>
          </span>

          <span>
            ${travelerName}
          </span>
        </div>

        <div
          class="delivery-row traveler-info"
        >
          <span>
            <strong>Rating:</strong>
          </span>

          <span>
            ★ ${travelerRating}
          </span>
        </div>
      `;
    }

    /* ========================================================
       PICKUP VERIFICATION
    ======================================================== */

    html += `
      <div class="delivery-row">
        <span>
          <strong>Pickup Code:</strong>
        </span>

        <span>
          ${delivery.pickupCode || "N/A"}
        </span>
      </div>

      <div class="delivery-row">
        <span>
          <strong>Verified:</strong>
        </span>

        <span>
          ${delivery.pickupVerified ? "Yes" : "No"}
        </span>
      </div>
    `;

    /* ========================================================
       PHOTO PREVIEW
    ======================================================== */

    if (delivery.package?.photoUrl) {
      html += `
        <div class="delivery-row">
          <img
            src="${delivery.package.photoUrl}"
            alt="Package Photo"
            class="delivery-photo-preview"
          >
        </div>
      `;
    }

    /* ========================================================
       CREATED DATE
    ======================================================== */

    html += `
      <div class="delivery-row">
        <small>
          ${
            delivery.createdAt
              ? new Date(
                  delivery.createdAt
                ).toLocaleString()
              : ""
          }
        </small>
      </div>
    `;

    /* ========================================================
       RATE TRAVELER ACTION
    ======================================================== */

    const ratingEligible =
      Boolean(delivery.travelerId) &&
      (
        delivery.status ===
          "payout_pending" ||
        delivery.status ===
          "payout_completed"
      );

    if (ratingEligible) {
      html += `
        <div
          class="delivery-row sender-rating-action"
        >
          <button
            type="button"
            class="primary-btn sender-rate-traveler-btn"
            data-delivery-id="${delivery._id || ""}"
            data-rated="false"
          >
            Rate Traveler
          </button>
        </div>
      `;
    }

    deliveryCard.innerHTML =
      html;

    /* ========================================================
       DELIVERY CARD CLICK
    ==========================================
          delivery
        );
      }
    );

    /* ========================================================
       RATE TRAVELER BUTTON
    ======================================================== */

    const ratingButton =
      deliveryCard.querySelector(
        ".sender-rate-traveler-btn"
      );

    if (ratingButton) {
      const deliveryId =
        String(
          delivery._id || ""
        );

      ratingButton.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (
            ratingButton.disabled ||
            ratingButton.dataset.rated ===
              "true"
          ) {
            return;
          }

          const traveler =
            delivery.travelerDetails &&
            typeof delivery.travelerDetails ===
              "object"
              ? delivery.travelerDetails
              : {};

          const travelerName =
            `${
              traveler.firstName || ""
            } ${
              traveler.lastName || ""
            }`.trim() ||
            "Traveler";

          window.dispatchEvent(
            new CustomEvent(
              "flexago:open-sender-rating",
              {
                detail: {
                  deliveryId,

                  travelerId:
                    String(
                      delivery.travelerId || ""
                    ),

                  travelerName
                }
              }
            )
          );
        }
      );

      loadDeliveryRatingState(
        deliveryId,
        ratingButton
      );
    }

    container.appendChild(
      deliveryCard
    );
  });
}

/* ============================================================
   UPDATE DELIVERY CARD AFTER RATING
============================================================ */

window.addEventListener(
  "flexago:sender-rating-submitted",
  (event) => {
    const detail =
      event.detail || {};

    const deliveryId =
      String(
        detail.deliveryId || ""
      );

    if (!deliveryId) {
      return;
    }

    const button =
      document.querySelector(
        `.sender-rate-traveler-btn[data-delivery-id="${deliveryId}"]`
      );

    if (!button) {
      return;
    }

    setDeliveryRatingButtonState(
      button,
      detail.rating
    );
  }
);

// ============================================================
// SENDER TRAVELER RATINGS
// ============================================================
function initSenderRating() {
  const modal =
    document.getElementById(
      "senderRatingModal"
    );

  const closeBtn =
    document.getElementById(
      "closeSenderRatingModal"
    );

  const deliveryReference =
    document.getElementById(
      "senderRatingDeliveryReference"
    );

  const starsContainer =
    document.getElementById(
      "senderRatingStars"
    );

  const selectionElement =
    document.getElementById(
      "senderRatingSelection"
    );

  const reviewInput =
    document.getElementById(
      "senderRatingReview"
    );

  const statusElement =
    document.getElementById(
      "senderRatingStatus"
    );

  const submitBtn =
    document.getElementById(
      "submitSenderRatingBtn"
    );

  if (
    !modal ||
    !closeBtn ||
    !deliveryReference ||
    !starsContainer ||
    !selectionElement ||
    !reviewInput ||
    !statusElement ||
    !submitBtn
  ) {
    console.warn(
      "Sender rating elements were not found."
    );

    return;
  }

  const starButtons =
    Array.from(
      starsContainer.querySelectorAll(
        ".sender-rating-star"
      )
    );

  let activeDeliveryId = "";
  let selectedRating = 0;
  let ratingSubmitting = false;

  // ==========================================================
  // GET AUTHORIZED SENDER ID
  // ==========================================================

  function getSenderRatingUserId() {
    return String(
      window.senderId ||
      user?._id ||
      localStorage.getItem("userId") ||
      ""
    ).trim();
  }

  // ==========================================================
  // STATUS
  // ==========================================================

  function showRatingStatus(
    message,
    type = "info"
  ) {
    statusElement.textContent =
      message;

    statusElement.className =
      `sender-rating-status ${type}`;
  }

  function clearRatingStatus() {
    statusElement.textContent = "";

    statusElement.className =
      "sender-rating-status hidden";
  }

  // ==========================================================
  // STAR SELECTION
  // ==========================================================

  function updateRatingStars(rating) {
    selectedRating =
      Number(rating) || 0;

    starButtons.forEach(
      (button) => {
        const buttonRating =
          Number(
            button.dataset.rating
          );

        const isActive =
          buttonRating <=
          selectedRating;

        button.classList.toggle(
          "active",
          isActive
        );

        button.setAttribute(
          "aria-checked",
          String(
            buttonRating ===
              selectedRating
          )
        );
      }
    );

    selectionElement.textContent =
      selectedRating > 0
        ? `${selectedRating} ${
            selectedRating === 1
              ? "star"
              : "stars"
          } selected`
        : "Select a rating";

    submitBtn.disabled =
      selectedRating === 0 ||
      ratingSubmitting;
  }

  // ==========================================================
  // RESET MODAL
  // ==========================================================

  function resetRatingModal() {
    activeDeliveryId = "";
    selectedRating = 0;
    ratingSubmitting = false;

    deliveryReference.textContent =
      "Completed delivery";

    reviewInput.value = "";

    submitBtn.disabled = true;
    submitBtn.textContent =
      "Submit Rating";

    clearRatingStatus();
    updateRatingStars(0);
  }

  // ==========================================================
  // OPEN MODAL
  // ==========================================================

  function openRatingModal(detail) {
    const deliveryId =
      String(
        detail?.deliveryId || ""
      ).trim();

    if (!deliveryId) {
      return;
    }

    resetRatingModal();

    activeDeliveryId =
      deliveryId;

    const travelerName =
      String(
        detail?.travelerName ||
        "Traveler"
      ).trim();

    deliveryReference.textContent =
      `${travelerName} | Delivery ${deliveryId}`;

    modal.classList.remove(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "modal-open"
    );

    if (
      window.lucide &&
      typeof window.lucide.createIcons ===
        "function"
    ) {
      window.lucide.createIcons();
    }

    starButtons[0]?.focus();
  }

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  function closeRatingModal() {
    if (ratingSubmitting) {
      return;
    }

    modal.classList.add(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "modal-open"
    );

    resetRatingModal();
  }

  // ==========================================================
  // SUBMIT RATING
  // ==========================================================

  async function submitRating() {
    if (ratingSubmitting) {
      return;
    }

    const senderId =
      getSenderRatingUserId();

    const review =
      reviewInput.value.trim();

    if (!senderId) {
      showRatingStatus(
        "Unable to identify the Sender.",
        "error"
      );

      return;
    }

    if (!activeDeliveryId) {
      showRatingStatus(
        "No completed delivery was selected.",
        "error"
      );

      return;
    }

    if (
      selectedRating < 1 ||
      selectedRating > 5
    ) {
      showRatingStatus(
        "Select a rating from 1 to 5 stars.",
        "error"
      );

      return;
    }

    if (review.length > 1000) {
      showRatingStatus(
        "Review cannot exceed 1000 characters.",
        "error"
      );

      return;
    }

    ratingSubmitting = true;

    submitBtn.disabled = true;
    submitBtn.textContent =
      "Submitting...";

    showRatingStatus(
      "Submitting your rating...",
      "info"
    );

    try {
      const response =
        await fetch(
          `${BASE_URL}/api/ratings`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-user-id":
                senderId,

              "x-user-role":
                "sender"
            },

            body:
              JSON.stringify({
                deliveryId:
                  activeDeliveryId,

                score:
                  selectedRating,

                review
              })
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        if (
          response.status === 409
        ) {
          showRatingStatus(
            "This delivery has already been rated.",
            "info"
          );

          submitBtn.textContent =
            "Already Rated";

          window.dispatchEvent(
            new CustomEvent(
              "flexago:sender-rating-submitted",
              {
                detail: {
                  deliveryId:
                    activeDeliveryId,

                  rating:
                    result.data || null,

                  alreadyRated:
                    true
                }
              }
            )
          );

          return;
        }

        throw new Error(
          result.error ||
          "Unable to submit your rating."
        );
      }

      showRatingStatus(
        "Thank you. Your Traveler rating was submitted successfully.",
        "success"
      );

      submitBtn.textContent =
        "Rating Submitted";

      window.dispatchEvent(
        new CustomEvent(
          "flexago:sender-rating-submitted",
          {
            detail: {
              deliveryId:
                activeDeliveryId,

              rating:
                result.data?.rating ||
                null,

              traveler:
                result.data?.traveler ||
                null,

              alreadyRated:
                false
            }
          }
        )
      );

    } catch (error) {
      console.error(
        "Unable to submit Sender rating:",
        error
      );

      ratingSubmitting = false;

      submitBtn.disabled =
        selectedRating === 0;

      submitBtn.textContent =
        "Submit Rating";

      showRatingStatus(
        error.message ||
        "Unable to submit your rating.",
        "error"
      );
    }
  }

  // ==========================================================
  // EVENTS
  // ==========================================================

  starButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          updateRatingStars(
            button.dataset.rating
          );
        }
      );

      button.addEventListener(
        "mouseenter",
        () => {
          const hoverRating =
            Number(
              button.dataset.rating
            );

          starButtons.forEach(
            (starButton) => {
              starButton.classList.toggle(
                "active",
                Number(
                  starButton.dataset.rating
                ) <= hoverRating
              );
            }
          );
        }
      );
    }
  );

  starsContainer.addEventListener(
    "mouseleave",
    () => {
      updateRatingStars(
        selectedRating
      );
    }
  );

  submitBtn.addEventListener(
    "click",
    submitRating
  );

  closeBtn.addEventListener(
    "click",
    closeRatingModal
  );

  modal.addEventListener(
    "click",
    (event) => {
      if (event.target === modal) {
        closeRatingModal();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        !modal.classList.contains(
          "hidden"
        )
      ) {
        closeRatingModal();
      }
    }
  );

  window.addEventListener(
    "flexago:open-sender-rating",
    (event) => {
      openRatingModal(
        event.detail
      );
    }
  );

  resetRatingModal();
}
// ============================================================
// SENDER SUPPORT TICKETS
// ============================================================

function initSenderSupportTickets() {
  const openBtn = document.getElementById(
    "openSenderSupportTicketBtn"
  );

  const modal = document.getElementById(
    "senderSupportTicketModal"
  );

  const closeBtn = document.getElementById(
    "closeSenderSupportTicketModal"
  );

  const categorySelect =
    document.getElementById(
      "senderSupportCategory"
    );

  const deliverySelect =
    document.getElementById(
      "senderSupportDeliveryId"
    );

  const subjectInput =
    document.getElementById(
      "senderSupportSubjectInput"
    );

  const messageInput =
    document.getElementById(
      "senderSupportMessageInput"
    );

  const statusElement =
    document.getElementById(
      "senderSupportTicketStatus"
    );

  const submitBtn =
    document.getElementById(
      "submitSenderSupportTicketBtn"
    );

  const categoryButtons =
    document.querySelectorAll(
      ".support-category"
    );

  if (
    !openBtn ||
    !modal ||
    !closeBtn ||
    !categorySelect ||
    !deliverySelect ||
    !subjectInput ||
    !messageInput ||
    !statusElement ||
    !submitBtn
  ) {
    console.warn(
      "Sender support-ticket elements were not found."
    );

    return;
  }

  let supportTicketSubmitting = false;
  let selectedSupportCategory = "";

  // ==========================================================
  // GET AUTHORIZED SENDER ID
  // ==========================================================

  function getSenderSupportUserId() {
    return String(
      user?._id ||
      window.senderId ||
      ""
    ).trim();
  }

  // ==========================================================
  // GET LOGGED-IN ACCOUNT INFORMATION
  // ==========================================================

  function getSenderSupportUser() {
    try {
      const storedUser =
        JSON.parse(
          localStorage.getItem("user") ||
          "null"
        );

      return (
        storedUser &&
        typeof storedUser === "object"
          ? storedUser
          : {}
      );

    } catch (error) {
      console.error(
        "Unable to read Sender support account information:",
        error
      );

      return {};
    }
  }

  // ==========================================================
  // NORMALIZE SUPPORT CATEGORY
  // ==========================================================

  function normalizeSupportCategory(
    category
  ) {
    const normalized = String(
      category || ""
    )
      .trim()
      .toLowerCase();

    /*
     * Existing Sender HTML uses "payments",
     * while the backend accepts "payment".
     */
    if (normalized === "payments") {
      return "payment";
    }

    return normalized;
  }

  // ==========================================================
  // STATUS MESSAGE
  // ==========================================================

  function showSenderSupportStatus(
    message,
    type = "info"
  ) {
    statusElement.textContent =
      message || "";

    statusElement.classList.remove(
      "hidden",
      "success",
      "error",
      "info"
    );

    if (!message) {
      statusElement.classList.add(
        "hidden"
      );

      return;
    }

    statusElement.classList.add(
      type
    );
  }

  // ==========================================================
  // FORMAT DELIVERY LABEL
  // ==========================================================

  function buildSenderSupportDeliveryLabel(
    delivery
  ) {
    const deliveryId = String(
      delivery?._id ||
      delivery?.id ||
      ""
    ).trim();

    const status = String(
      delivery?.status ||
      "delivery"
    )
      .trim()
      .replace(/_/g, " ");

    const description = String(
      delivery?.package?.description ||
      delivery?.itemDescription ||
      delivery?.description ||
      "Package"
    ).trim();

    const shortId =
      deliveryId.length > 8
        ? deliveryId.slice(-8)
        : deliveryId;

    return (
      `${description} - ${status} - #${shortId}`
    );
  }

  // ==========================================================
  // RESET DELIVERY DROPDOWN
  // ==========================================================

  function resetSenderDeliverySelect() {
    deliverySelect.innerHTML = "";

    const defaultOption =
      document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent =
      "Not related to a specific delivery";

    deliverySelect.appendChild(
      defaultOption
    );
  }

  // ==========================================================
  // POPULATE SENDER DELIVERIES
  // ==========================================================

  async function populateSenderSupportDeliveries() {
    resetSenderDeliverySelect();

    const senderUserId =
      getSenderSupportUserId();

    if (!senderUserId) {
      return;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/api/deliveries`,
        {
          method: "GET"
        }
      );

      let result = null;

      try {
        result = await response.json();

      } catch (parseError) {
        console.error(
          "Sender support delivery response parse error:",
          parseError
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
          result?.message ||
          "Unable to load Sender deliveries."
        );
      }

      const allDeliveries =
        Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(
                result?.deliveries
              )
              ? result.deliveries
              : [];

      const senderDeliveries =
        allDeliveries.filter(
          (delivery) => {
            const deliverySenderId =
              String(
                delivery?.senderId ||
                delivery?.sender?._id ||
                delivery?.sender ||
                ""
              ).trim();

            return (
              deliverySenderId ===
              senderUserId
            );
          }
        );

      senderDeliveries
        .sort((first, second) => {
          const firstDate =
            new Date(
              first?.createdAt || 0
            ).getTime();

          const secondDate =
            new Date(
              second?.createdAt || 0
            ).getTime();

          return secondDate - firstDate;
        })
        .forEach((delivery) => {
          const deliveryId = String(
            delivery?._id ||
            delivery?.id ||
            ""
          ).trim();

          if (!deliveryId) {
            return;
          }

          const option =
            document.createElement(
              "option"
            );

          option.value =
            deliveryId;

          option.textContent =
            buildSenderSupportDeliveryLabel(
              delivery
            );

          deliverySelect.appendChild(
            option
          );
        });

    } catch (error) {
      console.error(
        "Unable to populate Sender support deliveries:",
        error
      );

      showSenderSupportStatus(
        "Delivery references could not be loaded. You can still submit a general support ticket.",
        "info"
      );
    }
  }

  // ==========================================================
  // UPDATE CATEGORY BUTTON STATE
  // ==========================================================

  function updateCategoryButtonState(
    category
  ) {
    const normalizedCategory =
      normalizeSupportCategory(
        category
      );

    categoryButtons.forEach(
      (button) => {
        const buttonCategory =
          normalizeSupportCategory(
            button.dataset.category
          );

        button.classList.toggle(
          "active",
          Boolean(normalizedCategory) &&
          buttonCategory ===
            normalizedCategory
        );
      }
    );
  }

  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetSenderSupportForm({
    preserveCategory = false
  } = {}) {
    if (!preserveCategory) {
      selectedSupportCategory = "";
      categorySelect.value = "";

      updateCategoryButtonState("");
    }

    deliverySelect.value = "";
    subjectInput.value = "";
    messageInput.value = "";

    submitBtn.disabled = false;

    showSenderSupportStatus("");
  }

  // ==========================================================
  // OPEN MODAL
  // ==========================================================

  async function openSenderSupportModal(
    category = ""
  ) {
    selectedSupportCategory =
      normalizeSupportCategory(
        category
      );

    resetSenderSupportForm({
      preserveCategory:
        Boolean(
          selectedSupportCategory
        )
    });

    if (selectedSupportCategory) {
      categorySelect.value =
        selectedSupportCategory;

      updateCategoryButtonState(
        selectedSupportCategory
      );
    }

    modal.classList.remove(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "modal-open"
    );

    if (
      window.lucide &&
      typeof window.lucide.createIcons ===
        "function"
    ) {
      window.lucide.createIcons();
    }

    await populateSenderSupportDeliveries();

    window.setTimeout(() => {
      if (selectedSupportCategory) {
        subjectInput.focus();
      } else {
        categorySelect.focus();
      }
    }, 0);
  }

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  function closeSenderSupportModal() {
    if (supportTicketSubmitting) {
      return;
    }

    modal.classList.add(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "modal-open"
    );

    resetSenderSupportForm();

    openBtn.focus();
  }

  // ==========================================================
  // VALIDATE FORM
  // ==========================================================

  function validateSenderSupportForm() {
    const category =
      categorySelect.value.trim();

    const subject =
      subjectInput.value.trim();

    const description =
      messageInput.value.trim();

    if (!category) {
      showSenderSupportStatus(
        "Select an issue category.",
        "error"
      );

      categorySelect.focus();
      return false;
    }

    if (!subject) {
      showSenderSupportStatus(
        "Enter a subject for the support ticket.",
        "error"
      );

      subjectInput.focus();
      return false;
    }

    if (subject.length > 200) {
      showSenderSupportStatus(
        "Subject cannot exceed 200 characters.",
        "error"
      );

      subjectInput.focus();
      return false;
    }

    if (!description) {
      showSenderSupportStatus(
        "Describe the issue before submitting.",
        "error"
      );

      messageInput.focus();
      return false;
    }

    if (description.length > 5000) {
      showSenderSupportStatus(
        "Description cannot exceed 5000 characters.",
        "error"
      );

      messageInput.focus();
      return false;
    }

    return true;
  }

  // ==========================================================
  // SUBMIT SUPPORT TICKET
  // ==========================================================

  async function submitSenderSupportTicket() {
    if (supportTicketSubmitting) {
      return;
    }

    if (!validateSenderSupportForm()) {
      return;
    }

    const senderUserId =
      getSenderSupportUserId();

    if (!senderUserId) {
      showSenderSupportStatus(
        "Unable to identify the logged-in Sender.",
        "error"
      );

      return;
    }

    const accountUser =
      getSenderSupportUser();

    const firstName = String(
      accountUser.firstName ||
      ""
    ).trim();

    const lastName = String(
      accountUser.lastName ||
      ""
    ).trim();

    const requesterName =
      `${firstName} ${lastName}`.trim();

    const requesterEmail = String(
      accountUser.email ||
      window.senderEmail ||
      ""
    ).trim();

    const requesterPhone = String(
      accountUser.phone ||
      accountUser.phoneNumber ||
      ""
    ).trim();

    const payload = {
      category:
        normalizeSupportCategory(
          categorySelect.value
        ),

      subject:
        subjectInput.value.trim(),

      description:
        messageInput.value.trim(),

      deliveryId:
        deliverySelect.value.trim(),

      requesterName,
      requesterEmail,
      requesterPhone
    };

    supportTicketSubmitting = true;
    submitBtn.disabled = true;

    showSenderSupportStatus(
      "Submitting support ticket...",
      "info"
    );

    try {
      const response = await fetch(
        `${BASE_URL}/api/support-tickets`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-user-id":
              senderUserId,

            "x-user-role":
              "sender"
          },

          body: JSON.stringify(
            payload
          )
        }
      );

      let result = null;

      try {
        result =
          await response.json();

      } catch (parseError) {
        console.error(
          "Sender support response parse error:",
          parseError
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
          result?.message ||
          "Unable to submit support ticket."
        );
      }

      if (
        !result?.success ||
        !result?.data
      ) {
        throw new Error(
          result?.error ||
          "The support ticket was not created."
        );
      }

      const ticketNumber =
        result.data.ticketNumber ||
        "Unavailable";

      selectedSupportCategory = "";

      categorySelect.value = "";
      deliverySelect.value = "";
      subjectInput.value = "";
      messageInput.value = "";

      updateCategoryButtonState("");

      showSenderSupportStatus(
        `Support ticket submitted successfully. Ticket number: ${ticketNumber}`,
        "success"
      );

    } catch (error) {
      console.error(
        "Unable to submit Sender support ticket:",
        error
      );

      showSenderSupportStatus(
        error.message ||
        "Unable to submit support ticket.",
        "error"
      );

    } finally {
      supportTicketSubmitting = false;
      submitBtn.disabled = false;
    }
  }

  // ==========================================================
  // SUPPORT CATEGORY BUTTONS
  // ==========================================================

  categoryButtons.forEach(
    (button) => {
      button.type = "button";

      button.addEventListener(
        "click",
        () => {
          const category =
            normalizeSupportCategory(
              button.dataset.category
            );

          openSenderSupportModal(
            category
          );
        }
      );
    }
  );

  // ==========================================================
  // MANUAL CATEGORY SELECTOR
  // ==========================================================

  categorySelect.addEventListener(
    "change",
    () => {
      selectedSupportCategory =
        normalizeSupportCategory(
          categorySelect.value
        );

      updateCategoryButtonState(
        selectedSupportCategory
      );
    }
  );

  // ==========================================================
  // OPEN SUPPORT BUTTON
  // ==========================================================

  openBtn.addEventListener(
    "click",
    () => {
      openSenderSupportModal();
    }
  );

  // ==========================================================
  // CLOSE BUTTON
  // ==========================================================

  closeBtn.addEventListener(
    "click",
    closeSenderSupportModal
  );

  // ==========================================================
  // CLOSE WHEN BACKDROP IS CLICKED
  // ==========================================================

  modal.addEventListener(
    "click",
    (event) => {
      if (event.target === modal) {
        closeSenderSupportModal();
      }
    }
  );

  // ==========================================================
  // ESCAPE KEY
  // ==========================================================

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        !modal.classList.contains(
          "hidden"
        )
      ) {
        closeSenderSupportModal();
      }
    }
  );

  // ==========================================================
  // SUBMIT BUTTON
  // ==========================================================

  submitBtn.addEventListener(
    "click",
    submitSenderSupportTicket
  );
}
// ============================================================
// SENDER DELIVERY CHAT
// Sender to Traveler
// ============================================================

let senderChatWs = null;
let senderChatReconnectTimeout = null;
let activeSenderChatDeliveryId = null;
let senderChatShouldReconnect = true;
let senderChatJoined = false;
let senderChatSending = false;
let pendingSenderChatBroadcast = null;

// ============================================================
// GET AUTHORIZED SENDER USER ID
// ============================================================

function getSenderChatUserId() {
  return String(
    window.senderId ||
    user?._id ||
    localStorage.getItem("userId") ||
    ""
  ).trim();
}

// ============================================================
// SEND NATIVE WEBSOCKET PAYLOAD
// ============================================================

function sendSenderChatSocketPayload(payload) {
  if (
    !senderChatWs ||
    senderChatWs.readyState !== WebSocket.OPEN
  ) {
    return false;
  }

  senderChatWs.send(
    JSON.stringify(payload)
  );

  return true;
}

// ============================================================
// JOIN AUTHORIZED DELIVERY CHAT ROOM
// ============================================================

function joinSenderDeliveryChatRoom(deliveryId) {
  const senderUserId =
    getSenderChatUserId();

  if (
    !deliveryId ||
    !senderUserId
  ) {
    return false;
  }

  senderChatJoined = false;

  return sendSenderChatSocketPayload({
    type: "joinDeliveryChat",
    deliveryId: String(deliveryId),
    userId: senderUserId,
    userRole: "sender"
  });
}

// ============================================================
// BROADCAST SAVED MESSAGE
// ============================================================

function broadcastSenderDeliveryMessage(
  deliveryId,
  messageId
) {
  if (
    !deliveryId ||
    !messageId
  ) {
    return false;
  }

  if (!senderChatJoined) {
    pendingSenderChatBroadcast = {
      deliveryId: String(deliveryId),
      messageId: String(messageId)
    };

    return false;
  }

  return sendSenderChatSocketPayload({
    type: "delivery_chat_message",
    deliveryId: String(deliveryId),
    messageId: String(messageId)
  });
}

// ============================================================
// BROADCAST READ STATUS
// ============================================================

function broadcastSenderChatRead(deliveryId) {
  if (!deliveryId || !senderChatJoined) {
    return false;
  }

  return sendSenderChatSocketPayload({
    type: "delivery_chat_read",
    deliveryId: String(deliveryId)
  });
}

// ============================================================
// HANDLE SENDER CHAT WEBSOCKET MESSAGE
// ============================================================

function handleSenderChatSocketMessage(event) {
  try {
    const message = JSON.parse(
      event.data
    );

    if (
      message.type ===
      "delivery_chat_joined"
    ) {
      if (
        String(message.deliveryId) !==
        String(activeSenderChatDeliveryId)
      ) {
        return;
      }

      senderChatJoined =
        Boolean(message.success);

      window.dispatchEvent(
        new CustomEvent(
          "flexago:sender-chat-joined",
          {
            detail: message
          }
        )
      );

      if (
        senderChatJoined &&
        pendingSenderChatBroadcast &&
        pendingSenderChatBroadcast.deliveryId ===
          String(activeSenderChatDeliveryId)
      ) {
        const pending =
          pendingSenderChatBroadcast;

        pendingSenderChatBroadcast =
          null;

        broadcastSenderDeliveryMessage(
          pending.deliveryId,
          pending.messageId
        );
      }

      return;
    }

    if (
      message.type ===
      "delivery_chat_message"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "flexago:sender-chat-message",
          {
            detail: message
          }
        )
      );

      return;
    }

    if (
      message.type ===
      "delivery_chat_read"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "flexago:sender-chat-read",
          {
            detail: message
          }
        )
      );

      return;
    }

    if (
      message.type === "socket_error"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "flexago:sender-chat-error",
          {
            detail: message
          }
        )
      );
    }

  } catch (error) {
    console.error(
      "Sender delivery-chat WebSocket message error:",
      error
    );
  }
}

// ============================================================
// CONNECT SENDER NATIVE WEBSOCKET
// ============================================================

function connectSenderChatSocket() {
  if (
    senderChatWs &&
    (
      senderChatWs.readyState === WebSocket.OPEN ||
      senderChatWs.readyState === WebSocket.CONNECTING
    )
  ) {
    return senderChatWs;
  }

  clearTimeout(
    senderChatReconnectTimeout
  );

  try {
    senderChatWs =
      new WebSocket(
        DELIVERY_CHAT_WS_URL
      );

    senderChatWs.addEventListener(
      "open",
      () => {
        console.log(
          "Sender delivery-chat WebSocket connected."
        );

        if (activeSenderChatDeliveryId) {
          joinSenderDeliveryChatRoom(
            activeSenderChatDeliveryId
          );
        }
      }
    );

    senderChatWs.addEventListener(
      "message",
      handleSenderChatSocketMessage
    );

    senderChatWs.addEventListener(
      "error",
      (error) => {
        console.error(
          "Sender delivery-chat WebSocket error:",
          error
        );
      }
    );

    senderChatWs.addEventListener(
      "close",
      () => {
        console.warn(
          "Sender delivery-chat WebSocket disconnected."
        );

        senderChatWs = null;
        senderChatJoined = false;

        if (
          senderChatShouldReconnect &&
          activeSenderChatDeliveryId
        ) {
          senderChatReconnectTimeout =
            setTimeout(
              connectSenderChatSocket,
              3000
            );
        }
      }
    );

  } catch (error) {
    console.error(
      "Unable to initialize Sender delivery-chat WebSocket:",
      error
    );
  }

  return senderChatWs;
}

// ============================================================
// INITIALIZE SENDER DELIVERY CHAT PANEL
// ============================================================

function initSenderDeliveryChat() {
  const panel = document.getElementById(
    "senderDeliveryChatPanel"
  );

  const closeBtn = document.getElementById(
    "senderDeliveryChatCloseBtn"
  );

  const messagesContainer =
    document.getElementById(
      "senderDeliveryChatMessages"
    );

  const statusElement =
    document.getElementById(
      "senderDeliveryChatStatus"
    );

  const input = document.getElementById(
    "senderDeliveryChatInput"
  );

  const sendBtn = document.getElementById(
    "senderDeliveryChatSendBtn"
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
      "Sender delivery-chat elements were not found."
    );

    return;
  }

// ==========================================================
// MESSAGE UI HELPERS
// ==========================================================

function clearMessages() {
  messagesContainer.innerHTML = "";
}

function removeMessageState() {
  messagesContainer
    .querySelectorAll(
      ".sender-delivery-chat-empty"
    )
    .forEach((element) => {
      element.remove();
    });
}

function showMessageState(text) {
  clearMessages();

  const state =
    document.createElement("div");

  state.className =
    "sender-delivery-chat-empty";

  state.textContent = text;

  messagesContainer.appendChild(
    state
  );
}

function scrollMessagesToBottom() {
  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}

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

function renderSenderChatMessage(message) {
  if (!message) {
    return false;
  }

  const text =
    typeof message.message === "string"
      ? message.message.trim()
      : "";

  if (!text) {
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

  removeMessageState();

  const isSenderMessage =
    message.senderRole === "sender";

  const roleLabel =
    isSenderMessage
      ? "Sender"
      : "Traveler";

  let timeLabel = "";

  if (message.createdAt) {
    const createdAt =
      new Date(message.createdAt);

    if (
      !Number.isNaN(
        createdAt.getTime()
      )
    ) {
      timeLabel =
        createdAt.toLocaleTimeString(
          [],
          {
            hour: "numeric",
            minute: "2-digit"
          }
        );
    }
  }

  const row =
    document.createElement("div");

  row.className =
    `sender-delivery-chat-message ${
      isSenderMessage
        ? "sent"
        : "received"
    }`;

  if (messageId) {
    row.dataset.messageId =
      messageId;
  }

  const bubble =
    document.createElement("div");

  bubble.className =
    "sender-delivery-chat-message-bubble";

  const meta =
    document.createElement("div");

  meta.className =
    "delivery-chat-message-meta";

meta.textContent =
  timeLabel
    ? `${roleLabel} | ${timeLabel}`
    : roleLabel;

  const messageText =
    document.createElement("div");

  messageText.className =
    "delivery-chat-message-text";

  messageText.textContent =
    text;

  bubble.appendChild(meta);
  bubble.appendChild(messageText);

  row.appendChild(bubble);

  messagesContainer.appendChild(
    row
  );

  return true;
}

// ==========================================================
// RENDER MESSAGE HISTORY
// ==========================================================

function renderSenderChatHistory(messages) {
  clearMessages();

  if (
    !Array.isArray(messages) ||
    messages.length === 0
  ) {
    showMessageState(
      "No messages yet. Start the conversation with the Traveler."
    );

    return;
  }

  messages.forEach((message) => {
    renderSenderChatMessage(
      message
    );
  });

  scrollMessagesToBottom();
}
  // ==========================================================
  // MARK MESSAGES AS READ
  // ==========================================================

  async function markSenderChatRead(
    deliveryId
  ) {
    const senderUserId =
      getSenderChatUserId();

    if (
      !deliveryId ||
      !senderUserId
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
              senderUserId,
            "x-user-role":
              "sender"
          }
        }
      );

      if (!response.ok) {
        const result =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          result?.error ||
          "Unable to update message read status."
        );
      }

      broadcastSenderChatRead(
        deliveryId
      );

    } catch (error) {
      console.error(
        "Unable to mark Sender chat messages as read:",
        error
      );
    }
  }

  // ==========================================================
  // LOAD CONVERSATION HISTORY
  // ==========================================================

  async function loadSenderChatHistory(
    deliveryId
  ) {
    const senderUserId =
      getSenderChatUserId();

    if (!senderUserId) {
      statusElement.textContent =
        "Unable to identify the Sender.";

      showMessageState(
        "Unable to load the conversation."
      );

      return;
    }

    showMessageState(
      "Loading conversation..."
    );

    statusElement.textContent =
      "Loading conversation...";

    try {
      const response = await fetch(
        `${BASE_URL}/api/delivery-chat/${deliveryId}`,
        {
          method: "GET",
          headers: {
            "x-user-id":
              senderUserId,
            "x-user-role":
              "sender"
          }
        }
      );

      let result = null;

      try {
        result = await response.json();
      } catch (parseError) {
        console.error(
          "Sender chat response parse error:",
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
        String(activeSenderChatDeliveryId) !==
        String(deliveryId)
      ) {
        return;
      }

      const messages =
        Array.isArray(result.data)
          ? result.data
          : [];

      renderSenderChatHistory(
        messages
      );

      statusElement.textContent =
        messages.length > 0
          ? "Conversation connected."
          : "Start a conversation with the Traveler.";

      await markSenderChatRead(
        deliveryId
      );

    } catch (error) {
      console.error(
        "Unable to load Sender delivery chat:",
        error
      );

      if (
        String(activeSenderChatDeliveryId) !==
        String(deliveryId)
      ) {
        return;
      }

      showMessageState(
        error.message ||
        "Unable to load the conversation."
      );

      statusElement.textContent =
        "Conversation unavailable.";
    }
  }

  // ==========================================================
  // OPEN CHAT PANEL
  // ==========================================================

  function openSenderDeliveryChat(
    deliveryId
  ) {
    if (!deliveryId) {
      return;
    }

    activeSenderChatDeliveryId =
      String(deliveryId);

    senderChatJoined = false;

    panel.dataset.deliveryId =
      activeSenderChatDeliveryId;

    panel.classList.add("open");

    panel.setAttribute(
      "aria-hidden",
      "false"
    );

    input.value = "";
    input.disabled = false;
    sendBtn.disabled = false;

    statusElement.textContent =
      "Connecting to Traveler...";

    connectSenderChatSocket();

    joinSenderDeliveryChatRoom(
      activeSenderChatDeliveryId
    );

    loadSenderChatHistory(
      activeSenderChatDeliveryId
    );

    if (
      window.lucide &&
      typeof window.lucide.createIcons ===
        "function"
    ) {
      window.lucide.createIcons();
    }

    window.setTimeout(() => {
      input.focus();
    }, 0);
  }

  // ==========================================================
  // CLOSE CHAT PANEL
  // ==========================================================

  function closeSenderDeliveryChat() {
    panel.classList.remove("open");

    panel.setAttribute(
      "aria-hidden",
      "true"
    );

    delete panel.dataset.deliveryId;

    input.value = "";
    input.disabled = false;
    sendBtn.disabled = false;

    clearMessages();

    statusElement.textContent =
      "Delivery conversation";

    activeSenderChatDeliveryId = null;
    senderChatJoined = false;
    pendingSenderChatBroadcast = null;
  }

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  async function sendSenderChatMessage() {
    if (senderChatSending) {
      return;
    }

    const deliveryId =
      activeSenderChatDeliveryId;

    const senderUserId =
      getSenderChatUserId();

    const text =
      input.value.trim();

    if (!deliveryId) {
      statusElement.textContent =
        "No active delivery conversation.";

      return;
    }

    if (!senderUserId) {
      statusElement.textContent =
        "Unable to identify the Sender.";

      return;
    }

    if (!text) {
      statusElement.textContent =
        "Type a message before sending.";

      input.focus();
      return;
    }

    if (text.length > 2000) {
      statusElement.textContent =
        "Message cannot exceed 2000 characters.";

      input.focus();
      return;
    }

    senderChatSending = true;
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
              senderUserId,
            "x-user-role":
              "sender"
          },
          body: JSON.stringify({
            message: text
          })
        }
      );

      let result = null;

      try {
        result = await response.json();
      } catch (parseError) {
        console.error(
          "Sender message response parse error:",
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
        String(activeSenderChatDeliveryId) !==
        String(deliveryId)
      ) {
        return;
      }

      renderSenderChatMessage(
        result.data
      );

      scrollMessagesToBottom();

      input.value = "";

      statusElement.textContent =
        "Message sent.";

      const messageId =
        result.data._id ||
        result.data.id;

      if (messageId) {
        const broadcasted =
          broadcastSenderDeliveryMessage(
            deliveryId,
            messageId
          );

        if (!broadcasted) {
          connectSenderChatSocket();

          joinSenderDeliveryChatRoom(
            deliveryId
          );

          statusElement.textContent =
            "Message saved. Real-time connection is reconnecting.";
        }
      }

    } catch (error) {
      console.error(
        "Unable to send Sender delivery message:",
        error
      );

      if (
        String(activeSenderChatDeliveryId) ===
        String(deliveryId)
      ) {
        statusElement.textContent =
          error.message ||
          "Unable to send message.";
      }

    } finally {
      senderChatSending = false;
      sendBtn.disabled = false;
      input.disabled = false;

      if (
        String(activeSenderChatDeliveryId) ===
        String(deliveryId)
      ) {
        input.focus();
      }
    }
  }

  // ==========================================================
  // OPEN EVENT FROM DELIVERY STATUS VIEW
  // ==========================================================

  window.addEventListener(
    "flexago:open-sender-delivery-chat",
    (event) => {
      const deliveryId =
        event.detail?.deliveryId;

      openSenderDeliveryChat(
        deliveryId
      );
    }
  );

  // ==========================================================
  // CLOSE EVENTS
  // ==========================================================

  closeBtn.addEventListener(
    "click",
    closeSenderDeliveryChat
  );

  panel.addEventListener(
    "click",
    (event) => {
      if (event.target === panel) {
        closeSenderDeliveryChat();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        panel.classList.contains("open")
      ) {
        closeSenderDeliveryChat();
      }
    }
  );

  // ==========================================================
  // SEND EVENTS
  // ==========================================================

  input.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        sendSenderChatMessage();
      }
    }
  );

  sendBtn.addEventListener(
    "click",
    sendSenderChatMessage
  );

  // ==========================================================
  // WEBSOCKET JOIN RESULT
  // ==========================================================

  window.addEventListener(
    "flexago:sender-chat-joined",
    (event) => {
      const message =
        event.detail;

      if (
        !message ||
        String(message.deliveryId) !==
        String(activeSenderChatDeliveryId)
      ) {
        return;
      }

      if (message.success) {
        statusElement.textContent =
          "Real-time chat connected.";

        markSenderChatRead(
          activeSenderChatDeliveryId
        );

      } else {
        statusElement.textContent =
          message.error ||
          "Unable to join real-time chat.";
      }
    }
  );

  // ==========================================================
  // REAL-TIME MESSAGE
  // ==========================================================

  window.addEventListener(
    "flexago:sender-chat-message",
    (event) => {
      const socketMessage =
        event.detail;

      if (
        !socketMessage ||
        !socketMessage.data
      ) {
        return;
      }

      const deliveryId = String(
        socketMessage.deliveryId ||
        socketMessage.data.deliveryId ||
        ""
      );

      if (
        deliveryId !==
        String(activeSenderChatDeliveryId)
      ) {
        return;
      }

      const rendered =
        renderSenderChatMessage(
          socketMessage.data
        );

      if (!rendered) {
        return;
      }

      scrollMessagesToBottom();

      if (
        socketMessage.data.senderRole ===
        "traveler"
      ) {
        statusElement.textContent =
          "New message from the Traveler.";

        markSenderChatRead(
          activeSenderChatDeliveryId
        );

      } else {
        statusElement.textContent =
          "Message delivered.";
      }
    }
  );

  // ==========================================================
  // READ STATUS
  // ==========================================================

  window.addEventListener(
    "flexago:sender-chat-read",
    (event) => {
      const readMessage =
        event.detail;

      if (
        !readMessage ||
        String(readMessage.deliveryId) !==
        String(activeSenderChatDeliveryId)
      ) {
        return;
      }

      if (
        readMessage.readBy?.role ===
        "traveler"
      ) {
        statusElement.textContent =
          "Read by Traveler.";
      }
    }
  );

  // ==========================================================
  // SOCKET ERROR
  // ==========================================================

  window.addEventListener(
    "flexago:sender-chat-error",
    (event) => {
      if (!activeSenderChatDeliveryId) {
        return;
      }

      statusElement.textContent =
        event.detail?.error ||
        "Real-time chat connection error.";
    }
  );
}

// ============================================================
// CLOSE SENDER CHAT SOCKET WHEN LEAVING PAGE
// ============================================================

window.addEventListener(
  "beforeunload",
  () => {
    senderChatShouldReconnect = false;

    clearTimeout(
      senderChatReconnectTimeout
    );

    if (
      senderChatWs &&
      (
        senderChatWs.readyState ===
          WebSocket.OPEN ||
        senderChatWs.readyState ===
          WebSocket.CONNECTING
      )
    ) {
      senderChatWs.close();
    }
  }
);
/* ============================================================
   OPEN DELIVERY STATUS VIEW
============================================================ */

async function openDeliveryStatus(delivery) {
  const container =
    document.getElementById(
      "deliveryStatusContent"
    );

  if (!container) {
    console.error(
      "deliveryStatusContent was not found."
    );

    return;
  }

  container.innerHTML = "";

  /* ==========================================================
     TEXT ROW HELPER
  ========================================================== */

  const addTextRow = (label, value) => {
    const row =
      document.createElement("p");

    const labelElement =
      document.createElement("strong");

    labelElement.textContent =
      label + ": ";

    row.appendChild(
      labelElement
    );

    row.appendChild(
      document.createTextNode(
        value === null ||
        value === undefined ||
        value === ""
          ? "N/A"
          : String(value)
      )
    );

    container.appendChild(
      row
    );
  };

  /* ==========================================================
     DELIVERY TITLE
  ========================================================== */

  const title =
    document.createElement("h3");

  title.style.marginBottom =
    "1rem";

  title.textContent =
    "Delivery #" + delivery._id;

  container.appendChild(
    title
  );

  /* ==========================================================
     DELIVERY INFORMATION
  ========================================================== */

  addTextRow(
    "Status",
    formatDeliveryStatus(
      delivery.status
    )
  );

  addTextRow(
    "Pickup",
    delivery.pickup?.address ||
    "N/A"
  );

  addTextRow(
    "Dropoff",
    delivery.dropoff?.address ||
    "N/A"
  );

  addTextRow(
    "Pickup Code",
    delivery.pickupCode ||
    "-"
  );

  addTextRow(
    "Verified",
    delivery.pickupVerified
      ? "Yes"
      : "No"
  );

  /* ==========================================================
     TRAVELER INFORMATION
  ========================================================== */

  const travelerFirstName =
    delivery.travelerDetails?.firstName ||
    "";

  const travelerLastName =
    delivery.travelerDetails?.lastName ||
    "";

  const travelerName =
    (
      travelerFirstName +
      " " +
      travelerLastName
    ).trim() ||
    "Not assigned yet";

  const travelerRating =
    delivery.travelerDetails?.rating;

  addTextRow(
    "Traveler",
    travelerName
  );

  if (
    delivery.travelerId &&
    travelerRating !== null &&
    travelerRating !== undefined
  ) {
    addTextRow(
      "Rating",
      `⭐ ${travelerRating}`
    );
  }

  addTextRow(
    "Price",
    "$" +
    Number(
      delivery.price || 0
    ).toFixed(2)
  );

  /* ==========================================================
     CHAT WITH TRAVELER

     Chat is available after acceptance and remains available
     until the delivery reaches its final delivered state.
  ========================================================== */

  const activeChatStatuses = [
    "accepted",
    "picked_up",
    "in_transit"
  ];

  const deliveryStatus =
    String(
      delivery.status || ""
    )
      .trim()
      .toLowerCase();

  const canChatWithTraveler =
    Boolean(delivery.travelerId) &&
    activeChatStatuses.includes(
      deliveryStatus
    );

  if (canChatWithTraveler) {
    const chatButton =
      document.createElement("button");

    chatButton.type =
      "button";

    chatButton.className =
      "sender-delivery-chat-btn";

    chatButton.dataset.id =
      String(delivery._id);

    chatButton.title =
      "Chat with Traveler";

    chatButton.setAttribute(
      "aria-label",
      "Chat with Traveler"
    );

    const chatIcon =
      document.createElement("i");

    chatIcon.setAttribute(
      "data-lucide",
      "message-circle"
    );

    const chatLabel =
      document.createElement("span");

    chatLabel.textContent =
      "Chat with Traveler";

    chatButton.appendChild(
      chatIcon
    );

    chatButton.appendChild(
      chatLabel
    );

    chatButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        window.dispatchEvent(
          new CustomEvent(
            "flexago:open-sender-delivery-chat",
            {
              detail: {
                deliveryId:
                  String(delivery._id)
              }
            }
          )
        );
      }
    );

    container.appendChild(
      chatButton
    );

    if (
      window.lucide &&
      typeof window.lucide.createIcons ===
        "function"
    ) {
      window.lucide.createIcons();
    }
  }

  /* ==========================================================
     PROOF OF DELIVERY
  ========================================================== */

  const divider =
    document.createElement("hr");

  divider.style.margin =
    "1rem 0";

  divider.style.opacity =
    "0.3";

  container.appendChild(
    divider
  );

  const proofTitle =
    document.createElement("h4");

  proofTitle.style.marginBottom =
    "0.75rem";

  proofTitle.textContent =
    "Proof of Delivery";

  container.appendChild(
    proofTitle
  );

  addTextRow(
    "Signed By",
    delivery.signedBy ||
    "Not provided"
  );

  const deliveredDate =
    delivery.completedAt ||
    delivery.deliveredAt;

  addTextRow(
    "Delivered",
    deliveredDate
      ? new Date(
          deliveredDate
        ).toLocaleString()
      : "N/A"
  );

  /* ==========================================================
     DELIVERY PHOTO
  ========================================================== */

  if (delivery.proofPhoto) {
    const photoContainer =
      document.createElement("div");

    photoContainer.style.marginTop =
      "1rem";

    const photoLabel =
      document.createElement("strong");

    photoLabel.textContent =
      "Delivery Photo:";

    const photoBreak =
      document.createElement("br");

    const photo =
      document.createElement("img");

    photo.src =
      delivery.proofPhoto;

    photo.alt =
      "Proof of delivery";

    photo.style.maxWidth =
      "220px";

    photo.style.borderRadius =
      "8px";

    photo.style.marginTop =
      "8px";

    photoContainer.appendChild(
      photoLabel
    );

    photoContainer.appendChild(
      photoBreak
    );

    photoContainer.appendChild(
      photo
    );

    container.appendChild(
      photoContainer
    );

  } else {
    addTextRow(
      "Delivery Photo",
      "Not available"
    );
  }

  /* ==========================================================
     RECIPIENT SIGNATURE
  ========================================================== */

  if (delivery.signatureUrl) {
    const signatureContainer =
      document.createElement("div");

    signatureContainer.style.marginTop =
      "1rem";

    const signatureLabel =
      document.createElement("strong");

    signatureLabel.textContent =
      "Signature:";

    const signatureBreak =
      document.createElement("br");

    const signature =
      document.createElement("img");

    signature.src =
      delivery.signatureUrl;

    signature.alt =
      "Recipient signature";

    signature.style.maxWidth =
      "220px";

    signature.style.background =
      "#ffffff";

    signature.style.padding =
      "8px";

    signature.style.borderRadius =
      "8px";

    signature.style.marginTop =
      "8px";

    signatureContainer.appendChild(
      signatureLabel
    );

    signatureContainer.appendChild(
      signatureBreak
    );

    signatureContainer.appendChild(
      signature
    );

    container.appendChild(
      signatureContainer
    );

  } else {
    addTextRow(
      "Signature",
      "Not available"
    );
  }

  /* ==========================================================
     BACK BUTTON
  ========================================================== */

  const finalDivider =
    document.createElement("hr");

  finalDivider.style.margin =
    "1rem 0";

  finalDivider.style.opacity =
    "0.3";

  container.appendChild(
    finalDivider
  );

  const backButton =
    document.createElement("button");

  backButton.type =
    "button";

  backButton.className =
    "primary-btn";

  backButton.textContent =
    "Back to My Deliveries";

  backButton.addEventListener(
    "click",
    () => {
      showSenderView(
        "myDeliveriesView"
      );
    }
  );

  container.appendChild(
    backButton
  );

  showSenderView(
    "deliveryStatusView" 
  );
}
/* ============================================================
   LOGOUT â€” CLEAR AUTH + REDIRECT (OLD SYSTEM)
   ============================================================ */
function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("senderId");
  localStorage.removeItem("travelerId");
  localStorage.removeItem("senderEmail");

  window.location.href = "login.html";
}
/* ============================================================
   LOAD ACCOUNT & IDENTITY â€” FULL PROFILE POPULATION
============================================================ */
async function loadAccountAndIdentity() {
  try {
    const userId = window.senderId;
    if (!userId) {
      console.error("Missing senderId");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/users/${userId}`);
    if (!res.ok) {
      console.error("Failed to fetch user profile");
      return;
    }

    const user = await res.json();

    // ============================
    // HEADER SECTION
    // ============================
    document.getElementById("senderNameHeader").innerText =
      `${user.firstName || ""} ${user.lastName || ""}`;

    document.getElementById("joinedDate").innerText =
      new Date(user.createdAt).getFullYear();

    document.getElementById("deliveryCount").innerText =
      user.totalDeliveries || 0;

    // ============================
    // VERIFIED BADGES
    // ============================
    document.getElementById("verifiedPhone").innerText =
      user.phone ? "âœ“ Verified" : "Not Verified";

    document.getElementById("verifiedEmail").innerText =
      user.email ? "âœ“ Verified" : "Not Verified";

    document.getElementById("verifiedIdentity").innerText =
      user.kycVerified ? "âœ“ Verified" : "Pending";

    // ============================
    // PERSONAL INFORMATION FIELDS
    // ============================
    document.getElementById("firstName").value = user.firstName || "";
    document.getElementById("lastName").value = user.lastName || "";
    document.getElementById("dob").value = user.dob || "";
    document.getElementById("phone").value = user.phone || "";
    document.getElementById("email").value = user.email || "";

    document.getElementById("address").value = user.address || "";
    document.getElementById("city").value = user.city || "";
    document.getElementById("state").value = user.state || "";
    document.getElementById("zipcode").value = user.zipcode || "";
    document.getElementById("country").value = user.country || "";

  } catch (err) {
    console.error("Error loading account & identity:", err);
  }
}

/* ============================================================
   SAVE ACCOUNT CHANGES â€” ADDRESS ONLY (IDENTITY LOCKED)
============================================================ */
async function saveSenderAccount() {
  try {
    const userId = window.senderId;
    if (!userId) {
      alert("Missing sender ID.");
      return;
    }

    // Only editable fields (Option A)
    const payload = {
      address: document.getElementById("address").value.trim(),
      city: document.getElementById("city").value.trim(),
      state: document.getElementById("state").value.trim(),
      zipcode: document.getElementById("zipcode").value.trim(),
      country: document.getElementById("country").value.trim(),
    };

    const res = await fetch(`${BASE_URL}/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!json.success) {
      alert("Failed to update account: " + json.error);
      return;
    }

    alert("Account updated successfully!");
  } catch (err) {
    console.error("Error saving account:", err);
    alert("An error occurred while saving changes.");
  }
}
/* ============================================================
   PAYOUT VIEW INITIALIZER â€” SENDER VERSION
============================================================ */
function initSenderPayoutView() {

  console.log("âœ… initSenderPayoutView initialized");

  const cardTab = document.getElementById("senderPayoutCardTab");
  const bankTab = document.getElementById("senderPayoutBankTab");

  const cardForm = document.getElementById("senderPayoutCardForm");
  const bankForm = document.getElementById("senderPayoutBankForm");

  if (cardTab && bankTab && cardForm && bankForm) {
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

  const saveBtn = document.getElementById("saveSenderPayoutBtn");

  console.log("âœ… Save Button Found:", saveBtn);

  if (!saveBtn) {
    console.error("âŒ saveSenderPayoutBtn not found");
    return;
  }

  saveBtn.addEventListener("click", async () => {
    try {
      console.log("âœ… Save button clicked");

      const activeTab = document.querySelector(
        "#paymentsView .toggle-btn.active"
      );

      const method = activeTab?.dataset.method;

      if (!method) {
        throw new Error("Please select a payout method.");
      }

      if (!window.senderId) {
        throw new Error("Sender ID is missing. Please log in again.");
      }

      let payload;

      if (method === "card") {
        const accountName = document
          .getElementById("senderCardNameInput")
          ?.value.trim();

        const cardNumber = document
          .getElementById("senderCardNumberInput")
          ?.value.replace(/\D/g, "");

        const expiration = document
          .getElementById("senderCardExpInput")
          ?.value.trim();

        const cvv = document
          .getElementById("senderCardCvvInput")
          ?.value.replace(/\D/g, "");

        if (
          !accountName ||
          cardNumber.length < 4 ||
          !expiration ||
          cvv.length < 3
        ) {
          throw new Error("Please complete all debit card fields.");
        }

        payload = {
          type: "card",
          accountName,
          last4: cardNumber.slice(-4)
        };
      } else if (method === "bank") {
        const accountName = document
          .getElementById("senderBankNameInput")
          ?.value.trim();

        const routingNumber = document
          .getElementById("senderBankRoutingInput")
          ?.value.replace(/\D/g, "");

        const accountNumber = document
          .getElementById("senderBankAccountInput")
          ?.value.replace(/\D/g, "");

        const confirmAccountNumber = document
          .getElementById("senderBankConfirmInput")
          ?.value.replace(/\D/g, "");

        if (
          !accountName ||
          !routingNumber ||
          accountNumber.length < 4 ||
          !confirmAccountNumber
        ) {
          throw new Error("Please complete all bank account fields.");
        }

        if (accountNumber !== confirmAccountNumber) {
          throw new Error("Bank account numbers do not match.");
        }

        payload = {
          type: "bank",
          accountName,
          last4: accountNumber.slice(-4)
        };
      } else {
        throw new Error("Unsupported payout method.");
      }

      console.log("âœ… Saving payout method:", payload);
      console.log("âœ… Sender ID:", window.senderId);

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      const response = await fetch(
        `https://flexago-backend.onrender.com/api/users/payout-method/${window.senderId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      console.log("âœ… Response Status:", response.status);
      console.log("âœ… Response OK:", response.ok);

      const responseText = await response.text();

      console.log("âœ… Raw Response:", responseText);

      let result = {};

      if (responseText) {
        try {
          result = JSON.parse(responseText);
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
          result.error || "Failed to save payout method."
        );
      }

      const methodDisplay = document.getElementById(
        "senderPayoutMethodDisplay"
      );

      if (methodDisplay) {
        const methodLabel =
          payload.type === "card" ? "Debit Card" : "Bank Account";

        const iconName =
          payload.type === "card" ? "credit-card" : "banknote";

        methodDisplay.innerHTML = `
          <i data-lucide="${iconName}"></i>
          <span>${methodLabel} ending in ${payload.last4}</span>
        `;

        if (window.lucide) {
          lucide.createIcons();
        }
      }

      console.log("âœ… Payout method saved:", result);

      alert("Payout method saved successfully.");
    } catch (err) {
      console.error("âŒ Payout save failed:", err);

      alert(err.message || "Failed to save payout method.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Payout Method";
    }
  });
}
/* ============================================================
   FINAL DOM READY BOOTSTRAP â€” ACCOUNT DEFAULT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  safe(initSenderIcons);
  safe(initSenderDeliveryChat);
  safe(initSenderSupportTickets);
  safe(initSenderRating);
  safe(loadSenderIdentity);
  safe(initSenderSidebar);
  safe(initSenderCreateForm);
  safe(initSenderPhotoUpload);
  safe(initSenderGenerateDelivery);
  safe(initSenderPaymentConfirmation);
  safe(initSenderAccountView);
  safe(loadAccountAndIdentity);

  safe(initSenderPayoutView);
  safe(initPaymentFormatting);

  const saveBtn = document.getElementById("saveSenderAccountBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveSenderAccount);
  }

  const defaultView = document.getElementById("accountView");
  if (defaultView) defaultView.classList.remove("hidden");

  const accountBtn = document.querySelector(
    '.sidebar-item[data-view="account"]'
  );
  if (accountBtn) accountBtn.classList.add("active");
});
/* ============================================================
   PAYMENT FORMATTING (CARD + EXP + CVC)
============================================================ */
function initPaymentFormatting() {

  const cardNumberInput = document.getElementById("senderCardNumberInput");
  if (cardNumberInput) {
    cardNumberInput.addEventListener("input", () => {
      let v = cardNumberInput.value.replace(/\D/g, "").slice(0, 16);
      v = v.match(/.{1,4}/g)?.join("-") || "";
      cardNumberInput.value = v;
    });
  }

  const expInput = document.getElementById("senderCardExpInput");
  if (expInput) {
    expInput.addEventListener("input", () => {
      let v = expInput.value.replace(/\D/g, "").slice(0, 4);
      if (v.length >= 3) {
        v = v.slice(0, 2) + "/" + v.slice(2);
      }
      expInput.value = v;
    });
  }

  const cvvInput = document.getElementById("senderCardCvvInput");
  if (cvvInput) {
    cvvInput.addEventListener("input", () => {
      cvvInput.value = cvvInput.value.replace(/\D/g, "").slice(0, 4);
    });
  }
}
