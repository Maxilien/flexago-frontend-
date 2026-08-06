// ELEMENTS
const emailInput = document.getElementById("verifyEmailInput");
const codeInput = document.getElementById("verificationCode");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const getCodeBtn = document.getElementById("getCodeBtn");
const verifyCodeBtn = document.getElementById("verifyCodeBtn");
const nextBtn = document.getElementById("nextBtn");

// ⭐ Prevent toggling password before fields are enabled
function togglePassword(id) {
  const field = document.getElementById(id);
  if (!field || field.disabled) return; // prevents toggle before verification
  field.type = field.type === "password" ? "text" : "password";
}

// STEP 1 — SEND VERIFICATION CODE
getCodeBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim().toLowerCase();

  if (!email) {
    alert("Please enter your email.");
    return;
  }

  try {
    const res = await fetch("https://flexago-backend.onrender.com/api/verify/email/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const result = await res.json();

    if (!result.success) {
      alert(result.error || "Unable to send verification code.");
      return;
    }

    alert("Verification code sent to your email.");
  } catch (err) {
    console.error("Error sending code:", err);
    alert("Server error. Try again.");
  }
});

// STEP 2 — VERIFY CODE
verifyCodeBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim().toLowerCase();
  const code = codeInput.value.trim();

  if (!email || !code) {
    alert("Enter email and verification code.");
    return;
  }

  try {
    const res = await fetch("https://flexago-backend.onrender.com/api/verify/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });

    const result = await res.json();

    if (!result.success) {
      alert(result.error || "Invalid verification code.");
      return;
    }

    alert("Email verified successfully!");

    // ⭐ Unlock password fields
    passwordInput.disabled = false;
    confirmPasswordInput.disabled = false;

    // ⭐ Enable Next button
    nextBtn.disabled = false;

  } catch (err) {
    console.error("Error verifying code:", err);
    alert("Server error. Try again.");
  }
});

// STEP 3 — SAVE PASSWORD AND REDIRECT TO PHONE VERIFICATION
nextBtn.addEventListener("click", () => {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!password || !confirmPassword) {
    alert("Please enter and confirm your password.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  // ⭐ Save password for final account creation page
  localStorage.setItem("tempPassword", password);

  // ⭐ Redirect to phone verification page
  window.location.href = "verify-phone.html";
});
