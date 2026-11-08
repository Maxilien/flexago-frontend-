// Invite & rewards page, shared by the sender and traveler dashboards.
// Shows the user's referral code, a share button, credit and rewards.
(function () {
  const money = (value) => `$${Number(value || 0).toFixed(2).replace(/\.00$/, "")}`;

  const LABELS = {
    first_trip_bonus: "First trip bonus",
    referral_inviter: "Friend joined",
    referral_joined: "Welcome reward"
  };

  const STATUS = {
    credited: "Added to your credit",
    paid: "Paid to your payout account",
    owed: "Waiting for your payout account",
    failed: "Being reviewed",
    pending: "Processing"
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function share(code, amount, note) {
    const text =
      `Join me on FlexaGo. Use my code ${code} when you sign up, ` +
      `and we both get ${money(amount)} after your first delivery. https://flexagoo.com`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "FlexaGo", text });
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(text);
      note.textContent = "Invite copied. Paste it in a text or message.";
    } catch {
      note.textContent = `Share this code: ${code}`;
    }
  }

  async function render(mount) {
    mount.replaceChildren(el("p", "rewards-loading", "Loading your rewards..."));

    let data;
    try {
      const response = await fetch(`${window.Flexago.API}/api/rewards/me`);
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error);
      data = json.data;
    } catch (error) {
      mount.replaceChildren(el("p", "rewards-error", "Couldn't load your rewards. Please try again."));
      return;
    }

    const isTraveler = data.role === "traveler";
    const panel = el("div", "panel rewards-panel");

    const header = el("header", "panel-header");
    const titles = el("div");
    titles.append(
      el("div", "panel-title", "Invite & rewards"),
      el("div", "panel-subtitle", `Invite friends and you both get ${money(data.referralReward)}.`)
    );
    header.append(titles);

    const body = el("div", "panel-body");

    // Code and share
    const codeBlock = el("section", "section-block rewards-code-block");
    codeBlock.append(el("h2", "section-title", "Your invite code"));
    const code = el("div", "rewards-code", data.referralCode);
    code.setAttribute("aria-label", `Your invite code is ${data.referralCode.split("").join(" ")}`);
    const actions = el("div", "rewards-actions");
    const shareBtn = el("button", "primary-btn", "Share invite");
    shareBtn.type = "button";
    const copyBtn = el("button", "secondary-btn", "Copy code");
    copyBtn.type = "button";
    const note = el("p", "rewards-note");
    note.setAttribute("role", "status");
    shareBtn.addEventListener("click", () => share(data.referralCode, data.referralReward, note));
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(data.referralCode);
        note.textContent = "Code copied.";
      } catch {
        note.textContent = `Your code: ${data.referralCode}`;
      }
    });
    actions.append(shareBtn, copyBtn);
    codeBlock.append(code, actions, note);

    // How it works
    const how = el("section", "section-block");
    how.append(el("h2", "section-title", "How it works"));
    const steps = el("ol", "rewards-steps");
    [
      "Your friend enters your code when they create their FlexaGo account.",
      "They finish their first delivery, as a sender or a traveler.",
      `You both get ${money(data.referralReward)}. Senders get it as credit off their next delivery. Travelers get it paid to their payout account.`
    ].forEach((line) => steps.append(el("li", "", line)));
    how.append(steps);
    if (isTraveler) {
      how.append(el("p", "rewards-bonus", `First trip bonus: you also get ${money(data.firstTripBonus)} after your first completed delivery.`));
    }

    // Numbers
    const stats = el("section", "section-block rewards-stats");
    const stat = (value, label) => {
      const box = el("div", "rewards-stat");
      box.append(el("strong", "", value), el("span", "", label));
      return box;
    };
    stats.append(stat(String(data.invited), data.invited === 1 ? "friend joined" : "friends joined"));
    if (!isTraveler) {
      stats.append(stat(money(data.creditBalance), "credit for your next delivery"));
    }
    const earned = data.rewards.reduce((sum, reward) => sum + reward.amount, 0);
    stats.append(stat(money(earned), "earned so far"));

    // History
    const history = el("section", "section-block");
    history.append(el("h2", "section-title", "Your rewards"));
    if (!data.rewards.length) {
      history.append(el("p", "rewards-empty", "No rewards yet. Share your code to get started."));
    } else {
      const list = el("ul", "rewards-list");
      data.rewards.forEach((reward) => {
        const item = el("li", "rewards-item");
        const left = el("div");
        const title = LABELS[reward.type] || "Reward";
        left.append(
          el("strong", "", reward.friend && reward.type === "referral_inviter" ? `${title}: ${reward.friend}` : title),
          el("span", "", `${STATUS[reward.status] || reward.status} · ${new Date(reward.createdAt).toLocaleDateString()}`)
        );
        item.append(left, el("b", "rewards-amount", `+${money(reward.amount)}`));
        list.append(item);
      });
      history.append(list);
    }

    body.append(codeBlock, how, stats, history);
    panel.append(header, body);
    mount.replaceChildren(panel);
  }

  window.FlexagoRewards = { render };
})();
