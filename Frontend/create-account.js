console.log("🟢 create-account.js LOADED");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createAccountForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect fields
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // ⭐ Address fields (REQUIRED by backend)
    const address = document.getElementById("address").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const zipcode = document.getElementById("zipcode").value.trim();
    const country = document.getElementById("country").value.trim();

    // ⭐ DO NOT TRIM PASSWORDS
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const role = document.getElementById("role").value;

    // ⭐ Validate required fields
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !role ||
        !address || !city || !state || !zipcode || !country) {
      alert("Please fill out all fields.");
      return;
    }

    // ⭐ Validate password match
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // ⭐ Validate password length
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    try {
      // ⭐ Correct backend endpoint
      const res = await fetch("https://flexago-backend.onrender.com/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone,
          password,
          role,
          address,
          city,
          state,
          zipcode,
          country,
          kycVerified: true
        })
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Unable to create account.");
        return;
      }

      // Save user in localStorage
      localStorage.setItem("flexagoUser", JSON.stringify(data.data));

      // ⭐ Redirect based on role
      if (role === "traveler") {
        window.location.href = "traveler.html";
      } else if (role === "sender") {
        window.location.href = "Sender.html";
      } else {
        alert("Unknown role selected.");
      }

    } catch (err) {
      console.error("❌ Create Account Error:", err);
      alert("Something went wrong. Please try again.");
    }
  });
});
