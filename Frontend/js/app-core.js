/* ============================================================
   FLEXAGO APP CORE - load first on every page
   - Adds the login token to every backend request
   - Clean page addresses (no .html) on the web
   - Works unchanged inside the iOS app (Capacitor)
   - Shared photo tools and account deletion
============================================================ */
(function () {
  const PRODUCTION_API = "https://flexago-backend.onrender.com";
  const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const isNative = Boolean(window.Capacitor?.isNativePlatform?.());

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  // Local testing only; ignored on the live site and in the app.
  const API = (isLocal && !isNative && read("flexagoApiOverride")) || PRODUCTION_API;

  function token() { return read("authToken"); }

  function clearSession() {
    ["user", "userId", "senderId", "senderEmail", "travelerId", "authToken", "flexagoUser"]
      .forEach((key) => localStorage.removeItem(key));
  }

  function pageUrl(name) {
    return isNative ? `${name}.html` : `/${name}`;
  }

  function go(name) {
    window.location.href = pageUrl(name);
  }

  function saveSession(user, authToken) {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("userId", user._id);
    localStorage.setItem("authToken", authToken);

    if (user.role === "traveler") {
      localStorage.setItem("travelerId", user._id);
    } else {
      localStorage.setItem("senderId", user._id);
      localStorage.setItem("senderEmail", user.email || "");
    }
  }

  /* ---------- every backend call carries the login token ---------- */
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function (input, init = {}) {
    let url = typeof input === "string" ? input : input.url;

    if (!url.startsWith(PRODUCTION_API) && !url.startsWith(API)) {
      return nativeFetch(input, init);
    }

    url = url.replace(PRODUCTION_API, API);

    const headers = new Headers(init.headers || {});
    const loginToken = token();

    if (loginToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${loginToken}`);
    }

    const response = await nativeFetch(url, { ...init, headers });

    // Signup uses its own token, so only a real session is ended here.
    if (response.status === 401 && loginToken && !url.includes("/api/onboarding") && !url.includes("/login")) {
      clearSession();
      go("login");
    }

    return response;
  };

  /* ---------- live connections ---------- */
  window.flexagoSocketProtocols = () => ["flexago", token() || ""];

  /* ---------- clean addresses ---------- */
  if (!isNative && location.pathname.endsWith(".html")) {
    history.replaceState(null, "", location.pathname.replace(/\.html$/, "") + location.search + location.hash);
  }

  // Inside the app, pages are local files and need their extension.
  if (isNative) {
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[href]");
      const href = link?.getAttribute("href");

      if (href && /^[A-Za-z][\w-]*$/.test(href)) {
        event.preventDefault();
        go(href);
      }
    }, true);
  }

  /* ---------- photos ---------- */
  // Shrinks a phone photo so uploads stay small and fast.
  function compressImage(file, maxSize = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("That file could not be read as an image."));
      };

      image.src = url;
    });
  }

  // Thumbnail strip with optional remove buttons.
  function renderPhotoStrip(container, urls, onRemove) {
    if (!container) return;

    container.replaceChildren();
    container.classList.add("photo-strip");

    urls.forEach((url, index) => {
      const item = document.createElement("div");
      item.className = "photo-strip-item";

      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";

      const image = document.createElement("img");
      image.src = url;
      image.alt = `Photo ${index + 1}`;
      link.append(image);
      item.append(link);

      if (onRemove) {
        link.addEventListener("click", (event) => event.preventDefault());

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "photo-strip-remove";
        remove.setAttribute("aria-label", `Remove photo ${index + 1}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => onRemove(index));
        item.append(remove);
      }

      container.append(item);
    });
  }

  // All photos for a package, including older single-photo deliveries.
  function packagePhotos(delivery) {
    const list = delivery?.package?.photoUrls;
    if (Array.isArray(list) && list.length) return list;
    return delivery?.package?.photoUrl ? [delivery.package.photoUrl] : [];
  }

  // Shows extra photos under the main one on delivery detail screens.
  function showExtraPhotos(mainImage, urls) {
    if (!mainImage) return;

    let strip = mainImage.nextElementSibling;

    if (!strip?.classList?.contains("photo-strip")) {
      strip = document.createElement("div");
      mainImage.after(strip);
    }

    renderPhotoStrip(strip, urls.length > 1 ? urls : []);
  }

  /* ---------- verified status ---------- */
  function verifiedFlags(user) {
    return {
      phone: Boolean(user.phoneVerified),
      email: Boolean(user.emailVerified),
      identity: Boolean(user.identityVerified)
    };
  }

  function fillVerifiedBadges(user, ids) {
    const flags = verifiedFlags(user);

    Object.entries(ids).forEach(([field, id]) => {
      const element = document.getElementById(id);
      if (!element) return;

      // Written in English; the language layer translates and re-translates it.
      element.textContent = flags[field] ? "✓ Verified" : "Not Verified";
      element.classList.toggle("is-verified", flags[field]);
    });
  }

  // The Verification tab. Checks happen once, during signup.
  async function renderVerification(container) {
    if (!container) return;

    const response = await fetch(`${API}/api/users/me`);
    const { data: user } = await response.json();
    const flags = verifiedFlags(user);

    const rows = [
      ["Email", flags.email],
      ["Phone number", flags.phone],
      ["Identity check", flags.identity]
    ];

    if (user.role === "traveler") {
      rows.push([
        "Background check",
        user.traveler?.background_status === "clear"
      ]);
    }

    const list = document.createElement("ul");
    list.className = "verification-list";

    rows.forEach(([label, done]) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const status = document.createElement("strong");

      name.textContent = label;
      status.textContent = done ? "✓ Verified" : "Not Verified";
      status.classList.toggle("is-verified", done);
      item.append(name, status);
      list.append(item);
    });

    container.replaceChildren(list);
  }

  /* ---------- account deletion (App Store requirement) ---------- */
  function mountDeleteAccount(container) {
    if (!container || container.querySelector(".danger-zone")) return;

    const zone = document.createElement("section");
    zone.className = "danger-zone";
    zone.innerHTML = `
      <h3 data-i18n="account.delete_title">Delete account</h3>
      <p data-i18n="account.delete_body">This permanently removes your personal details. Delivery and payment records are kept without your details, as required for tax and disputes.</p>
      <label class="form-label" for="deleteAccountPassword" data-i18n="account.delete_password">Enter your password to confirm</label>
      <input id="deleteAccountPassword" class="input-field" type="password" autocomplete="current-password" />
      <p class="danger-zone-error" role="alert"></p>
      <button type="button" class="danger-zone-btn" data-i18n="account.delete_button">Delete my account</button>
    `;

    zone.querySelector("button").addEventListener("click", async () => {
      const button = zone.querySelector("button");
      const error = zone.querySelector(".danger-zone-error");
      const password = zone.querySelector("input").value;

      error.textContent = "";

      if (!password) {
        error.textContent = window.t?.("account.delete_password") || "Enter your password to confirm";
        return;
      }

      button.disabled = true;

      try {
        const response = await fetch(`${API}/api/users/me`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        });
        const result = await response.json();

        if (!result.success) {
          error.textContent = result.error || "Unable to delete account";
          button.disabled = false;
          return;
        }

        clearSession();
        go("login");
      } catch (e) {
        error.textContent = "Unable to delete account";
        button.disabled = false;
      }
    });

    container.append(zone);
  }

  /* ---------- phone menu ---------- */
  function initMenu() {
    const button = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");

    if (!button || !sidebar) return;

    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    document.body.append(backdrop);

    button.setAttribute("aria-label", "Menu");
    button.setAttribute("aria-expanded", "false");

    const setOpen = (open) => {
      document.body.classList.toggle("sidebar-open", open);
      button.setAttribute("aria-expanded", String(open));
    };

    button.addEventListener("click", () => {
      setOpen(!document.body.classList.contains("sidebar-open"));
    });

    backdrop.addEventListener("click", () => setOpen(false));

    sidebar.addEventListener("click", (event) => {
      if (event.target.closest(".sidebar-item")) setOpen(false);
    });
  }

  document.addEventListener("DOMContentLoaded", initMenu);

  window.Flexago = {
    API,
    isNative,
    token,
    go,
    pageUrl,
    saveSession,
    clearSession,
    compressImage,
    renderPhotoStrip,
    packagePhotos,
    showExtraPhotos,
    fillVerifiedBadges,
    renderVerification,
    mountDeleteAccount
  };
})();
