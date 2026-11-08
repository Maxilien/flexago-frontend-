/* On phones, the Create Delivery form becomes four short steps. */
(function () {
  const pickup = document.getElementById("pickupInput");
  const grid = pickup?.closest(".form-grid");
  const actions = document.querySelector("#generate-matches-btn")?.closest(".action-row");

  if (!grid || !actions) return;

  const STEPS = [
    { name: "Route", fields: ["pickupInput", "dropoffInput", "deliveryType"] },
    { name: "Package", fields: ["sizePills", "valueInput", "packageType", "weightInput", "itemDescription", "insuranceType", "notesInput", "photoInput"] },
    { name: "People", fields: ["senderName", "receiverName"] },
    { name: "Review", fields: ["estimateShell", "promoCodeInput", "itemConfirm"] }
  ];

  const form = grid.parentElement;
  let current = 1;

  STEPS.forEach((step, index) => {
    step.fields.forEach((id) => {
      const field = document.getElementById(id)?.closest(".form-field");
      if (field) field.dataset.formStep = index + 1;
    });
  });

  const label = document.createElement("p");
  label.className = "post-steps-label";
  grid.before(label);

  const nav = document.createElement("div");
  nav.className = "post-steps-nav";
  const back = document.createElement("button");
  const next = document.createElement("button");
  back.type = next.type = "button";
  back.className = "post-steps-back";
  back.textContent = "Back";
  next.className = "primary-btn";
  next.textContent = "Next";
  nav.append(back, next);
  actions.before(nav);

  const value = (id) => document.getElementById(id)?.value.trim();

  // Returns what's missing on this step, if anything.
  function problem() {
    if (current === 1) {
      const area = window.FlexagoServiceArea?.problem();
      if (area) return area;
      if (window.isWaitingForAirport?.()) return "Please choose an airport for this international delivery.";
      if (!value("pickup-lat") || !value("dropoff-lat")) return "Choose your pickup and drop-off from the suggestions.";
    }

    if (current === 2 && !value("weightInput")) return "Please enter package weight.";

    if (current === 3) {
      const needed = ["senderName", "senderPhone", "senderEmail", "receiverName", "receiverPhone", "receiverEmail", "receiverAddress"];
      if (needed.some((id) => !value(id))) return "Please complete all sender and receiver details.";
    }

    return "";
  }

  function show(step) {
    current = step;
    form.dataset.step = step;
    label.textContent = `Step ${step} of ${STEPS.length}: ${STEPS[step - 1].name}`;
    back.hidden = step === 1;
    next.hidden = step === STEPS.length;
    form.closest("section")?.scrollIntoView({ block: "start" });
  }

  next.addEventListener("click", () => {
    const missing = problem();

    if (missing) {
      alert(missing);
      return;
    }

    show(current + 1);
  });

  back.addEventListener("click", () => show(current - 1));

  current = 1;
  form.dataset.step = 1;
  label.textContent = `Step 1 of ${STEPS.length}: ${STEPS[0].name}`;
  back.hidden = true;
})();
