async function login(email, password) {
  try {
    const res = await fetch(
      "https://flexago-backend.onrender.com/api/users/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const result = await res.json();

    // Check HTTP response
    if (!res.ok) {
      alert(
        result.error ||
        result.message ||
        "Login failed"
      );
      return;
    }

    // Backend may return either data or user
    const user =
      result.data ||
      result.user;

    if (!user) {
      alert(
        "Login failed: no user returned from server"
      );
      return;
    }

    // Authentication token is required
    if (!result.token) {
      alert(
        "Login failed: no authentication token returned"
      );
      return;
    }

    // Save logged-in user
    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    localStorage.setItem(
      "userId",
      user._id
    );

    // Save JWT for authenticated API requests
    localStorage.setItem(
      "authToken",
      result.token
    );

    // Traveler-specific ID
    if (user.role === "traveler") {
      window.travelerId =
        user._id;

      localStorage.setItem(
        "travelerId",
        user._id
      );
    }

    // Redirect based on role
    if (user.role === "sender") {
      Flexago.go("Sender");

    } else if (
      user.role === "traveler"
    ) {
      Flexago.go("traveler");

    } else {
      alert("Unknown user role");
    }

  } catch (err) {
    console.error(
      "Login error:",
      err
    );

    alert(
      "Unable to connect to server. Please try again."
    );
  }
}

/* ============================================================
   LOGIN BUTTON
============================================================ */

document
  .getElementById("login-btn")
  .addEventListener(
    "click",
    () => {
      const email =
        document
          .getElementById("email")
          .value
          .trim();

      const password =
        document
          .getElementById("password")
          .value;

      login(
        email,
        password
      );
    }
  );