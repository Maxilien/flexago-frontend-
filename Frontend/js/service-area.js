/* Where FlexaGo delivers. At launch that is Texas only: the server
   refuses anything else, and this file tells people early, right
   under the address they picked, instead of at the last step. */
(function () {
  // Used until the server answers, and if it can't be reached.
  let area = { limited: true, states: ["TX"], name: "Texas", deliveryTypes: ["local"] };
  const blocked = new Set();

  // i18n-extra.js translates new text on the page by itself.
  const t = (text) => text;

  function noteFor(input) {
    const shell = input.closest(".input-shell") || input;
    let note = shell.parentElement.querySelector(".area-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "area-note";
      note.setAttribute("role", "status");
      shell.insertAdjacentElement("afterend", note);
    }
    return note;
  }

  function showNote(input, text, kind) {
    const note = noteFor(input);
    note.textContent = text;
    note.className = `area-note ${kind || ""}`;
    note.hidden = !text;
  }

  // Google address parts -> { state, country }
  function placeParts(components) {
    const find = (type) => (components || []).find((part) => part.types.includes(type));
    return {
      state: find("administrative_area_level_1")?.short_name || "",
      country: find("country")?.short_name || ""
    };
  }

  function outside(place) {
    if (!area.limited || !place) return false;
    if (place.country && place.country !== "US") return true;
    if (place.state && !area.states.includes(place.state)) return true;
    return false;
  }

  function senderMessage() {
    return `FlexaGo is in ${area.name} only for now. Choose an address in ${area.name}.`;
  }

  function travelerMessage() {
    return `FlexaGo deliveries are in ${area.name} only for now, so you'll see jobs whose pickup and drop-off are both in ${area.name}.`;
  }

  // Delivery type: only the types the launch area allows.
  function applyDeliveryTypes() {
    const select = document.getElementById("deliveryType");
    if (!select) return;

    [...select.options].forEach((option) => {
      const allowed = !area.limited || area.deliveryTypes.includes(option.value);
      option.disabled = !allowed;
      option.hidden = !allowed;
    });

    if (area.limited && !area.deliveryTypes.includes(select.value)) {
      select.value = area.deliveryTypes[0];
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    showNote(select, area.limited ? `Deliveries within ${area.name} only for now.` : "", "info");
  }

  window.FlexagoServiceArea = {
    placeParts,

    // Sender picked an address. Returns true when it can be used.
    checkSenderPlace(end, input, place) {
      if (outside(place)) {
        blocked.add(end);
        showNote(input, t(senderMessage()), "bad");
        return false;
      }
      blocked.delete(end);
      showNote(input, "");
      return true;
    },

    // Travelers aren't stopped; they just learn which jobs they'll see.
    checkTravelerPlace(input, place) {
      showNote(input, outside(place) ? t(travelerMessage()) : "", "info");
    },

    // For the step-by-step form: what's stopping step 1, if anything.
    problem() {
      return blocked.size ? t(senderMessage()) : "";
    },

    get limited() { return area.limited; }
  };

  function start() {
    applyDeliveryTypes();

    const api = window.Flexago?.API;
    if (!api) return;

    fetch(`${api}/api/service-area`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          area = json.data;
          applyDeliveryTypes();
        }
      })
      .catch(() => {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
