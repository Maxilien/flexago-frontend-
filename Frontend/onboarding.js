/* ============================================================
   STRICT SIGNUP FLOW
   The server records every verified fact. This page only keeps
   a signed session token, so steps can't be skipped or faked,
   and passwords are never stored in the browser.
============================================================ */
(function () {
  const TOKEN_KEY = "flexagoOnboardingToken";
  const API = `${window.Flexago.API}/api/onboarding`;
  const step = document.body.dataset.step;
  const message = document.getElementById("message");
  const tr = (key, fallback) => {
    const value = window.t ? window.t(key) : "";
    return value && value !== key ? value : fallback;
  };

  function show(text, kind = "error") {
    message.textContent = text || "";
    message.className = `message ${text ? kind : ""}`;
  }

  async function api(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(`${API}${path}`, {
      method: options.body ? "POST" : options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : options.method ? "{}" : undefined
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.Flexago.go(window.Flexago.token() ? "login" : "signup");
      throw new Error("expired");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || tr("auth.error_generic", "Something went wrong. Please try again."));
    }

    return result;
  }

  async function guarded(button, action) {
    show("");
    if (button) button.disabled = true;

    try {
      await action();
    } catch (error) {
      if (error.message !== "expired") {
        show(error instanceof TypeError ? tr("auth.error_network", "Can't reach Flexago. Check your connection.") : error.message);
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  // Sends people to the first step they haven't finished.
  function nextPage(state) {
    if (!state.emailVerified) return "verify-email";
    if (!state.phoneVerified) return "verify-phone";
    if (!state.identityVerified) return "verify-identity";
    return "create-account";
  }

  async function loadState() {
    if (!localStorage.getItem(TOKEN_KEY)) {
      window.Flexago.go("signup");
      throw new Error("expired");
    }

    const { data } = await api("/status");
    const expected = nextPage(data);
    const onIdentityPage = step === "verify-stripe" && expected === "verify-identity";

    if (expected !== step && !onIdentityPage) {
      window.Flexago.go(expected);
      throw new Error("expired");
    }

    return data;
  }

  function codeStep(channel, valueOf) {
    const sendBtn = document.getElementById("sendBtn");
    const verifyBtn = document.getElementById("verifyBtn");
    const code = document.getElementById("code");

    sendBtn.addEventListener("click", () => guarded(sendBtn, async () => {
      await api(`/${channel}/send`, { body: { [channel]: valueOf() } });
      show(tr("auth.code_sent", "Code sent."), "success");
      code.focus();
    }));

    verifyBtn.addEventListener("click", () => guarded(verifyBtn, async () => {
      const { data } = await api(`/${channel}/verify`, { body: { code: code.value.trim() } });
      window.Flexago.go(nextPage(data));
    }));
  }

  function flagFor(iso) {
    return [...iso].map((letter) =>
      String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)
    ).join("");
  }

  function initCountryPicker() {
    const button = document.getElementById("countryBtn");
    const panel = document.getElementById("countryPanel");
    const search = document.getElementById("countrySearch");
    const list = document.getElementById("countryList");
    const code = document.getElementById("countryCode");

    const language = document.documentElement.lang || "en";
    const localNames = new Intl.DisplayNames([language], { type: "region" });
    const englishNames = new Intl.DisplayNames(["en"], { type: "region" });

    const countries = window.FLEXAGO_COUNTRIES
      .map((country) => ({
        ...country,
        name: localNames.of(country.iso),
        english: englishNames.of(country.iso)
      }))
      .sort((a, b) => a.name.localeCompare(b.name, language));

    const setOpen = (open) => {
      panel.classList.toggle("hidden", !open);
      button.setAttribute("aria-expanded", String(open));
    };

    const choose = (country) => {
      code.value = country.dial;
      button.textContent = `${flagFor(country.iso)} ${country.dial}`;
      setOpen(false);
      document.getElementById("phone").focus();
    };

    const render = () => {
      const query = search.value.trim().toLowerCase().replace(/^\+/, "");

      list.replaceChildren(...countries
        .filter((country) =>
          !query ||
          country.name.toLowerCase().includes(query) ||
          country.english.toLowerCase().includes(query) ||
          country.dial.slice(1).startsWith(query)
        )
        .map((country) => {
          const item = document.createElement("li");
          const option = document.createElement("button");

          item.setAttribute("role", "option");
          option.type = "button";
          option.textContent = `${flagFor(country.iso)} ${country.name} ${country.dial}`;
          option.addEventListener("click", () => choose(country));
          item.append(option);
          return item;
        }));
    };

    button.addEventListener("click", () => {
      const open = panel.classList.contains("hidden");

      setOpen(open);

      if (open) {
        search.value = "";
        render();
        search.focus();
      }
    });

    search.addEventListener("input", render);

    const region = (navigator.language.split("-")[1] || "US").toUpperCase();

    choose(
      countries.find((country) => country.iso === region) ||
      countries.find((country) => country.iso === "US")
    );

    document.getElementById("phone").blur();
  }

  const steps = {
    signup() {
      document.getElementById("startForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const button = event.target.querySelector("button");

        guarded(button, async () => {
          const role = document.querySelector('input[name="role"]:checked')?.value;

          if (!role) throw new Error(tr("auth.error_role", "Please choose how you'll use Flexago."));

          const { token, data } = await api("/start", {
            body: {
              firstName: document.getElementById("firstName").value,
              lastName: document.getElementById("lastName").value,
              role
            }
          });

          localStorage.setItem(TOKEN_KEY, token);
          window.Flexago.go(nextPage(data));
        });
      });
    },

    "verify-email"() {
      guarded(null, async () => {
        const state = await loadState();

        if (state.reverify) {
          const email = document.getElementById("email");
          email.value = state.email;
          email.readOnly = true;
        }
      });
      codeStep("email", () => document.getElementById("email").value);
    },

    "verify-phone"() {
      guarded(null, loadState);
      initCountryPicker();

      codeStep("phone", () => {
        const code = document.getElementById("countryCode").value;
        const digits = document.getElementById("phone").value.replace(/\D/g, "");

        // Most countries drop the leading 0 of a local number; Italy keeps it.
        const national = code === "+39" ? digits : digits.replace(/^0+/, "");

        return `${code}${national}`;
      });
    },

    "verify-identity"() {
      guarded(null, async () => {
        const state = await loadState();

        if (state.identityStatus === "mismatch") {
          show(tr("auth.identity_mismatch", "The name on your ID doesn't match the name you entered. Contact support."));
          document.getElementById("startBtn").disabled = true;
        } else if (state.identityStatus === "failed") {
          show(tr("auth.identity_failed", "We couldn't verify your ID. Please try again."));
        }
      });

      const startBtn = document.getElementById("startBtn");

      startBtn.addEventListener("click", () => guarded(startBtn, async () => {
        const result = await api("/identity/start", { method: "POST" });

        if (result.alreadyVerified) window.Flexago.go("create-account");
        else window.location.href = result.url;
      }));
    },

    // Stripe returns here. Only the server's answer counts.
    "verify-stripe"() {
      let tries = 0;

      async function check() {
        try {
          const state = await loadState();

          if (state.identityVerified) {
            window.Flexago.go("create-account");
          } else if (state.identityStatus === "pending" && tries < 40) {
            tries += 1;
            setTimeout(check, 3000);
          } else {
            window.Flexago.go("verify-identity");
          }
        } catch (error) {
          if (error.message !== "expired") {
            show(tr("auth.error_network", "Can't reach Flexago. Check your connection."));
            document.getElementById("retryBtn").classList.remove("hidden");
          }
        }
      }

      document.getElementById("retryBtn").addEventListener("click", () => {
        document.getElementById("retryBtn").classList.add("hidden");
        show("");
        tries = 0;
        check();
      });

      check();
    },

    "create-account"() {
      let reverifying = false;

      guarded(null, async () => {
        const state = await loadState();
        document.getElementById("fullName").value = `${state.firstName} ${state.lastName}`;
        document.getElementById("email").value = state.email;
        document.getElementById("phone").value = state.phone;

        if (state.reverify) {
          reverifying = true;
          ["password", "confirmPassword"].forEach((id) => {
            const field = document.getElementById(id);
            field.closest("form").querySelector(`label[for="${id}"]`).classList.add("hidden");
            field.classList.add("hidden");
          });
          document.querySelector("#createForm .fine-print").classList.add("hidden");
          document.querySelector("#createForm button").setAttribute("data-i18n", "auth.finish_verification");
          window.setLanguage(document.documentElement.lang);
        }
      });

      document.getElementById("createForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const button = event.target.querySelector("button");

        guarded(button, async () => {
          const password = document.getElementById("password").value;

          if (!reverifying && password !== document.getElementById("confirmPassword").value) {
            throw new Error(tr("auth.error_password_match", "Passwords do not match."));
          }

          const result = await api("/complete", {
            body: { dob: document.getElementById("dob").value, password }
          });

          localStorage.removeItem(TOKEN_KEY);
          window.Flexago.saveSession(result.data, result.token);
          window.Flexago.go(result.data.role === "sender" ? "Sender" : "traveler");
        });
      });
    }
  };

  steps[step]?.();
})();
