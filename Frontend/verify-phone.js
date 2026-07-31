// ============================================================
// ELEMENTS
// ============================================================
const countryCode = document.getElementById("countryCode");
const phoneInput = document.getElementById("phoneInput");
const smsCodeInput = document.getElementById("smsCodeInput");

const sendSmsBtn = document.getElementById("sendSmsBtn");
const verifyPhoneBtn = document.getElementById("verifyPhoneBtn");
const resendPhoneBtn = document.getElementById("resendPhoneBtn");
const nextBtn = document.getElementById("nextBtn");

// ============================================================
// AUTO FORMAT PHONE BY COUNTRY
// ============================================================
phoneInput.addEventListener("input", () => {
  const raw = phoneInput.value.replace(/\D/g, "");
  const code = countryCode.value;
  let formatted = raw;

  // 🇺🇸 US
  if (code === "+1") {
    if (raw.length > 3 && raw.length <= 6) {
      formatted = `(${raw.slice(0,3)}) ${raw.slice(3)}`;
    } else if (raw.length > 6) {
      formatted = `(${raw.slice(0,3)}) ${raw.slice(3,6)}-${raw.slice(6,10)}`;
    }
  }

  // 🇪🇸 Spain
  if (code === "+34") {
    if (raw.length > 3 && raw.length <= 5) {
      formatted = `${raw.slice(0,3)} ${raw.slice(3)}`;
    } else if (raw.length > 5) {
      formatted = `${raw.slice(0,3)} ${raw.slice(3,5)} ${raw.slice(5,7)} ${raw.slice(7,9)}`;
    }
  }

  // 🇬🇧 UK
  if (code === "+44") {
    if (raw.length > 4 && raw.length <= 7) {
      formatted = `${raw.slice(0,4)} ${raw.slice(4)}`;
    } else if (raw.length > 7) {
      formatted = `${raw.slice(0,4)} ${raw.slice(4,7)} ${raw.slice(7,11)}`;
    }
  }

  // 🇦🇺 Australia
  if (code === "+61") {
    if (raw.length > 4) {
      formatted = `${raw.slice(0,4)} ${raw.slice(4,7)} ${raw.slice(7,10)}`;
    }
  }

  // 🇫🇷 France
  if (code === "+33") {
    if (raw.length > 2) {
      formatted = `${raw.slice(0,2)} ${raw.slice(2,4)} ${raw.slice(4,6)} ${raw.slice(6,8)} ${raw.slice(8,10)}`;
    }
  }

  // 🇩🇪 Germany
  if (code === "+49") {
    if (raw.length > 3) {
      formatted = `${raw.slice(0,3)} ${raw.slice(3)}`;
    }
  }

  // 🇯🇵 Japan
  if (code === "+81") {
    if (raw.length > 3 && raw.length <= 7) {
      formatted = `${raw.slice(0,3)}-${raw.slice(3)}`;
    } else if (raw.length > 7) {
      formatted = `${raw.slice(0,3)}-${raw.slice(3,7)}-${raw.slice(7,11)}`;
    }
  }

  // 🇦🇪 UAE
  if (code === "+971") {
    if (raw.length > 3) {
      formatted = `${raw.slice(0,3)}-${raw.slice(3,6)}-${raw.slice(6,10)}`;
    }
  }

  phoneInput.value = formatted;
});

// ============================================================
// STEP 1 — SEND SMS CODE
// ============================================================
sendSmsBtn.addEventListener("click", async () => {
  const raw = phoneInput.value.replace(/\D/g, "");
  const fullPhone = `${countryCode.value}${raw}`;

  if (!raw) {
    alert("Please enter your phone number.");
    return;
  }

  // Twilio compliance logging
  console.log("User consented to SMS messaging per CTA on verify-phone page.");

  localStorage.setItem("tempPhone", fullPhone);

  try {
    const res = await fetch("https://flexago-backend.onrender.com/api/verify/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone })
    });

    const result = await res.json();

    if (!result.success) {
      alert(result.error || "Unable to send SMS code.");
      return;
    }

    alert("SMS verification code sent.");
  } catch (err) {
    console.error("Error sending SMS:", err);
    alert("Server error. Try again.");
  }
});

// ============================================================
// STEP 2 — VERIFY SMS CODE
// ============================================================
verifyPhoneBtn.addEventListener("click", async () => {
  const phone = localStorage.getItem("tempPhone");
  const code = smsCodeInput.value.trim();

  if (!phone || !code) {
    alert("Enter phone number and SMS code.");
    return;
  }

  try {
    const res = await fetch("https://flexago-backend.onrender.com/api/verify/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code })
    });

    const result = await res.json();

    if (!result.success) {
      alert(result.error || "Invalid SMS code.");
      return;
    }

    alert("Phone verified!");

    localStorage.setItem("tempPhoneVerified", "true");

    nextBtn.disabled = false;
    nextBtn.classList.add("enabled");

  } catch (err) {
    console.error("Error verifying phone:", err);
    alert("Server error. Try again.");
  }
});

// ============================================================
// STEP 3 — RESEND SMS CODE
// ============================================================
resendPhoneBtn.addEventListener("click", async () => {
  const phone = localStorage.getItem("tempPhone");

  if (!phone) {
    alert("Enter your phone number first.");
    return;
  }

  try {
    await fetch("https://flexago-backend.onrender.com/api/verify/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });

    alert("SMS code sent again.");
  } catch (err) {
    console.error("Error resending SMS:", err);
    alert("Server error. Try again.");
  }
});

// ============================================================
// STEP 4 — NEXT BUTTON → Identity Verification
// ============================================================
nextBtn.addEventListener("click", () => {
  window.location.href = "verify-identity.html";
});
