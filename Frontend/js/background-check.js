/* The last step of signup. Checkr clears the user, and the app opens by itself. */
(function () {
  const CHECK_EVERY_MS = 15000;

  const title = document.getElementById("bgTitle");
  const text = document.getElementById("bgText");
  const start = document.getElementById("bgStart");
  const message = document.getElementById("message");

  const SCREENS = {
    not_started: {
      title: "Background check",
      text: "Everyone on FlexaGo passes a background check. This keeps senders and travelers safe. You'll give your consent and enter your details on our partner Checkr's secure page.",
      button: "Start background check"
    },
    invited: {
      title: "Finish your background check",
      text: "Your application with Checkr isn't finished yet.",
      button: "Continue background check"
    },
    pending: {
      title: "We're checking your background",
      text: "This can take from a few minutes to a few days. You can close the app. It will open for you once you're cleared."
    },
    canceled: {
      title: "Start your background check again",
      text: "Your last background check was canceled before it finished, so it has no result. Start a new one to use FlexaGo.",
      button: "Start background check"
    },
    disputed: {
      title: "Your dispute is being reviewed",
      text: "Checkr is looking into the information you disputed. We'll open the app for you if your check clears. Questions: support@flexagoo.com."
    },
    pre_adverse_action: {
      title: "We can't give you access right now",
      text: "Checkr has sent you a notice with a copy of your report and your rights. You have time to dispute anything that's wrong with Checkr before a final decision is made."
    },
    blocked: {
      title: "We can't give you access right now",
      text: "Your background check didn't clear. Checkr will contact you about your report, or you can email support@flexagoo.com."
    }
  };

  function show(status) {
    const screen = SCREENS[status] || SCREENS.blocked;

    title.textContent = screen.title;
    text.textContent = screen.text;
    start.textContent = screen.button || "";
    start.classList.toggle("hidden", !screen.button);
  }

  async function goToApp() {
    const response = await fetch(`${Flexago.API}/api/users/me`);
    const { data: user } = await response.json();

    Flexago.go(user.role === "sender" ? "Sender" : "traveler");
  }

  async function check() {
    if (!Flexago.token()) {
      Flexago.go("login");
      return;
    }

    try {
      const response = await fetch(`${Flexago.API}/api/background/status`);
      const { status } = await response.json();

      if (status === "clear") {
        await goToApp();
        return;
      }

      show(status);
    } catch (error) {
      message.textContent = "We couldn't check your status. We'll keep trying.";
    }
  }

  start.addEventListener("click", async () => {
    start.disabled = true;
    message.textContent = "";

    try {
      const response = await fetch(`${Flexago.API}/api/background/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      const result = await response.json();

      if (result.alreadyClear) await goToApp();
      else if (result.url) await Flexago.openExternal(result.url, check);
      else message.textContent = result.error || "Unable to start your background check. Please try again.";
    } catch (error) {
      message.textContent = "Unable to start your background check. Please try again.";
    }

    start.disabled = false;
  });

  check();
  setInterval(check, CHECK_EVERY_MS);
})();
