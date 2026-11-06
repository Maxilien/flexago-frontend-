/* ============================================================
   ALICE - FlexaGo's help assistant inside the app.
   Her answers are copied from the website's js/alice.js, so
   change both. She opens from the chat button and from Support.
============================================================ */
(function () {

  // Signed-in people go straight to the help for their role.
  const START = document.currentScript.dataset.start;

  const widget = document.createElement("div");
  widget.id = "alice-widget";
  widget.innerHTML = `
    <div id="alice-window" class="alice-hidden" role="dialog" aria-label="Alice">
      <div id="alice-header">
        <div class="alice-header-left">
          <div class="alice-avatar"><span>🤖</span></div>
          <div class="alice-header-info">
            <strong>Alice</strong>
            <span>FlexaGo Assistant</span>
          </div>
        </div>
        <button id="alice-close" type="button" aria-label="Close Alice">✕</button>
      </div>
      <div id="alice-messages"></div>
      <div id="alice-quick-replies"></div>
      <div id="alice-input-row">
        <input id="alice-input" type="text" placeholder="Ask Alice anything…" autocomplete="off" />
        <button id="alice-send" type="button" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>`;
  document.body.append(widget);

  const aliceWindow = document.getElementById("alice-window");
  const closeBtn    = document.getElementById("alice-close");
  const messages    = document.getElementById("alice-messages");
  const inputEl     = document.getElementById("alice-input");
  const sendBtn     = document.getElementById("alice-send");
  const qrPanel     = document.getElementById("alice-quick-replies");

  let isOpen     = false;
  let hasOpened  = false;
  let stateStack = [];

  const SIGNUP = "";
  const SUPPORT = `📧 <a href="mailto:support@flexagoo.com">support@flexagoo.com</a>`;

  const flow = {

    greeting: {
      message: `👋 Hi! I'm <strong>Alice</strong>, your FlexaGo assistant.<br><br>Which best describes you? You can also just type your question.`,
      options: [
        { label: "📦 I'm a Sender",       next: "sender_l1"   },
        { label: "🧳 I'm a Traveler",      next: "traveler_l1" },
        { label: "🆕 I'm New to FlexaGo", next: "new_user"    },
      ]
    },

    /* ── NEW USERS ───────────────────────────────────────── */
    new_user: {
      message: `Welcome to FlexaGo! 🎉 We connect people who need something delivered with verified travelers already going that way. What would you like to know?`,
      options: [
        { label: "How does FlexaGo work?", k: "what is flexago explain about",
          answer: `1️⃣ A <strong>sender</strong> posts a delivery and pays<br>2️⃣ A <strong>traveler</strong> going that way accepts it<br>3️⃣ The traveler confirms pickup with a code<br>4️⃣ The traveler delivers it with photos and a signature, then gets paid ✅<br><br>${SIGNUP}` },
        { label: "How do I create an account?", k: "sign up signup register join start",
          answer: `Signup takes 5 steps, and every step is checked:<br><br>1️⃣ Your legal name, and whether you'll send or carry<br>2️⃣ Email code<br>3️⃣ Text message code<br>4️⃣ ID photo and selfie<br>5️⃣ Date of birth and password<br><br>You must be 18 or older, and your name must match your ID.<br><br>${SIGNUP}` },
        { label: "Why do you check my ID?", k: "identity verify verification selfie why stripe",
          answer: `So everyone knows who they're dealing with. 🔒 Your ID and selfie are checked by Stripe Identity, a trusted verification service. Your verified name, email and phone can't be changed afterward, which helps prevent fraud.` },
        { label: "Is there a mobile app?", k: "iphone ios android download phone app store",
          answer: `You're using it now! 📱 FlexaGo also works in your phone's browser.` },
        { label: "What languages do you support?", k: "language spanish french creole haitian chinese portuguese",
          answer: `FlexaGo is available in English, Spanish, French, Haitian Creole, Chinese and Portuguese. Use the language menu at the top of the page. 🌍` },
        { label: "📦 I want to send something", next: "sender_l1"   },
        { label: "🧳 I want to earn on trips",  next: "traveler_l1" },
      ]
    },

    /* ── SENDERS ─────────────────────────────────────────── */
    sender_l1: {
      message: `Great! As a <strong>Sender</strong>, what can I help you with? 📦`,
      options: [
        { label: "📦 How do I send a package?",  next: "sender_how"     },
        { label: "💰 How much does it cost?",    next: "sender_cost"    },
        { label: "📋 What can I send?",          next: "sender_items"   },
        { label: "📍 Tracking my delivery",      next: "sender_track"   },
        { label: "🔒 Safety and protection",     next: "sender_safety"  },
        { label: "🆘 Help with a delivery",      next: "sender_help"    },
      ]
    },

    sender_how: {
      message: `What would you like to know about sending?`,
      options: [
        { label: "How do I post a delivery?", k: "create request new send package ship post",
          answer: `1️⃣ Log in and open <strong>Create Delivery</strong><br>2️⃣ Enter pickup and drop-off addresses<br>3️⃣ Add the item type, size, weight and value<br>4️⃣ Add up to 5 photos<br>5️⃣ Enter the receiver's details<br>6️⃣ Pay to publish it ✅<br><br>${SIGNUP}` },
        { label: "How do I get matched with a traveler?", k: "match find traveler who carries",
          answer: `Once you've paid, your delivery appears for verified travelers whose trip passes near both your pickup and drop-off, going the right direction. A traveler then accepts it, and you'll see them on your delivery. 🚗` },
        { label: "What happens after I post?", k: "next after steps process",
          answer: `1️⃣ A traveler accepts your delivery<br>2️⃣ You give them your pickup code at handoff<br>3️⃣ You follow the delivery in the app<br>4️⃣ They deliver it with photos and a signature<br>5️⃣ You can rate your traveler ⭐` },
        { label: "What's the pickup code?", k: "code handoff verify pickup",
          answer: `It's a code only you can see in your delivery details. Give it to your traveler in person at pickup. It proves the right person collected your package. 🔑 Don't share it before then.` },
        { label: "How many photos can I add?", k: "photo picture image upload",
          answer: `Up to 5 photos per delivery. 📸 Clear photos help your traveler recognize the package.` },
      ]
    },

    sender_cost: {
      message: `Here's how pricing works. What would you like to know?`,
      options: [
        { label: "How is the price calculated?", k: "price cost fee how much rate estimate quote",
          answer: `FlexaGo calculates your price automatically. It's based on:<br><br>📏 Distance and delivery type (local, nationwide or international)<br>⚖️ Weight and size<br>📦 Item type<br>💎 Declared value<br>🛡️ Any protection you add<br><br>You'll see the full price before you pay. ✅` },
        { label: "When do I pay?", k: "charge pay when upfront billing",
          answer: `You pay when you post, and your delivery is published once payment goes through. 💳 It only reaches travelers after that.` },
        { label: "How do I pay?", k: "card credit debit payment method cash stripe",
          answer: `By card, securely through Stripe. 🔒 Your card details are handled by Stripe, and cash isn't accepted.` },
      ]
    },

    sender_items: {
      message: `What would you like to know about what you can send?`,
      options: [
        { label: "What types of items can I send?", k: "allowed item send types box envelope",
          answer: `Delivery types include envelopes, documents, small to large boxes, bags, electronics and fragile items. 📦 Choose the closest type when you post.` },
        { label: "What items are NOT allowed?", k: "prohibited banned illegal weapon weapons gun guns firearm knife ammo ammunition drugs marijuana alcohol animal animals pet pets dog dogs cat cats dangerous restricted",
          answer: `❌ Weapons or ammunition<br>❌ Illegal substances<br>❌ Hazardous materials<br>❌ Live animals<br>❌ Counterfeit goods<br><br>Please see our <a href="terms.html">Terms</a> or ask support if you're unsure.` },
        { label: "Can I send internationally?", k: "international abroad country overseas customs",
          answer: `Yes. ✈️ International handoffs happen at airports, for both pickup and drop-off. Enter a city or address and we'll show the closest airports to choose from. You're responsible for following customs rules for what you send. ${SUPPORT}` },
      ]
    },

    sender_track: {
      message: `Let's find your package. What do you need?`,
      options: [
        { label: "How do I track my delivery?", k: "track tracking where status location map live package",
          answer: `Log in and open <strong>Delivery Status</strong> or <strong>My Deliveries</strong>, then select your delivery. 📍 You'll see its status and route.` },
        { label: "Will I get updates?", k: "notification text email update alert sms",
          answer: `Yes. We send updates by text and email at key moments, such as when a traveler accepts and when your package is delivered. 🔔` },
        { label: "How do I know it was delivered?", k: "delivered proof confirm signature",
          answer: `Your traveler adds delivery photos and the recipient's signature. ✍️ You can see this proof on your delivery.` },
        { label: "Can I message my traveler?", k: "chat contact message talk call",
          answer: `Yes. Once a traveler accepts, use the chat on your delivery. 💬` },
      ]
    },

    sender_safety: {
      message: `Safety comes first. What would you like to know?`,
      options: [
        { label: "How are travelers checked?", k: "safe trust verified background check who",
          answer: `Every traveler verifies their email, phone and government ID with a selfie. 🪪 They must also pass a background check before accepting their first job.` },
        { label: "Is my package protected?", k: "insurance protection coverage covered lost damaged",
          answer: `You can choose a protection option when you post. 🛡️ For coverage details or a claim, please contact our team: ${SUPPORT}` },
        { label: "Is my payment secure?", k: "secure payment safe card data",
          answer: `Yes. Payments are handled by Stripe. 🔒 Your card number is entered directly with Stripe, not stored by FlexaGo.` },
      ]
    },

    sender_help: {
      message: `I'm sorry you need help. What's going on?`,
      options: [
        { label: "How do I report or block someone?", k: "report block abuse harassment scam",
          answer: `Open your delivery chat and tap <strong>Report</strong>. 🚩 Choose a reason, add details, and tick <strong>Also block this person</strong> if you'd like. Our team reviews every report.` },
        { label: "I need a refund or to cancel", k: "refund cancel money back dispute charged wrong",
          answer: `Please contact our team and include your delivery details, and they'll review it for you: ${SUPPORT}` },
        { label: "My package is late, lost or damaged", k: "late lost damaged missing broken wrong address no show",
          answer: `First message your traveler in the delivery chat. If that doesn't solve it, open <strong>Support</strong> in your account, or email us with your delivery details: ${SUPPORT}` },
        { label: "How do I delete my account?", k: "delete close remove account",
          answer: `Go to <strong>Account & Identity</strong>, scroll to <strong>Delete account</strong> and confirm your password. You'll need to finish any active deliveries first.` },
      ]
    },

    /* ── TRAVELERS ───────────────────────────────────────── */
    traveler_l1: {
      message: `Great! As a <strong>Traveler</strong>, what can I help you with? 🧳`,
      options: [
        { label: "🚀 Getting started",        next: "traveler_start" },
        { label: "🗺️ Finding jobs",           next: "traveler_jobs"  },
        { label: "💵 Earnings and payouts",   next: "traveler_money" },
        { label: "📦 Doing a delivery",       next: "traveler_job"   },
        { label: "🆘 Help and safety",        next: "traveler_help"  },
      ]
    },

    traveler_start: {
      message: `Here's how to get going. What would you like to know?`,
      options: [
        { label: "What do I need to start?", k: "become traveler requirements start begin earn join",
          answer: `1️⃣ Create an account and verify your email, phone and ID<br>2️⃣ Add your address<br>3️⃣ Complete a background check<br>4️⃣ Connect Stripe to get paid<br><br>Then you're ready to take jobs. 🎉<br><br>${SIGNUP}` },
        { label: "Why is a background check required?", k: "background check checkr criminal",
          answer: `People trust travelers with their packages, so every traveler needs a clear background check before accepting a first job. 🛡️ Start it from the <strong>Verification</strong> tab. Our partner Checkr handles your consent and details securely.` },
        { label: "My background check needs review", k: "consider review pending suspended result",
          answer: `Some results need a person to review them, and you can't accept jobs until that's done. Please contact our team: ${SUPPORT}` },
      ]
    },

    traveler_jobs: {
      message: `Here's how jobs work. What would you like to know?`,
      options: [
        { label: "How do I find jobs?", k: "find search jobs route trip available",
          answer: `Open <strong>Jobs / Requests</strong>, enter your start and destination, and tap <strong>Search Jobs</strong>. 🗺️ You'll see deliveries that fit your route, closest first.` },
        { label: "Which deliveries will I see?", k: "miles near distance corridor off route how far detour",
          answer: `Only deliveries that fit your trip:<br><br>📍 Pickup and drop-off within <strong>6 miles</strong> of your route, or within <strong>20 miles</strong> of your start or destination<br>➡️ Going the same direction you are<br><br>Each job shows how far off your route it is.` },
        { label: "Can I decline a job?", k: "decline reject skip",
          answer: `Yes. 👍 You choose which jobs to accept, and declined jobs disappear from your results.` },
        { label: "Do I have to work set hours?", k: "schedule hours shift when flexible",
          answer: `No. There are no shifts or quotas. Accept only the jobs that fit your trip. 🗓️` },
      ]
    },

    traveler_money: {
      message: `Let's talk money. What would you like to know?`,
      options: [
        { label: "How much do I earn?", k: "earn earns earning earnings make money pay percent commission cut payout amount income salary travelers",
          answer: `You keep <strong>80%</strong> of each delivery's price. 💵 You'll see the payout on every job before you accept it.` },
        { label: "How do I get paid?", k: "get paid stripe connect bank account",
          answer: `Connect your Stripe account in <strong>Payouts</strong>. 🏦 Your payment is sent after you complete a delivery.` },
        { label: "Can I withdraw instantly?", k: "instant withdraw cash out fast",
          answer: `If it's available on your account, you'll see <strong>Instant Withdraw</strong> in Payouts, along with your balance. ⚡ Stripe decides eligibility.` },
      ]
    },

    traveler_job: {
      message: `What part of a delivery can I help with?`,
      options: [
        { label: "How does pickup work?", k: "pickup collect code",
          answer: `Meet the sender and ask for their <strong>pickup code</strong>. Enter it in the app to confirm you've got the package. 🔑` },
        { label: "How do I complete a delivery?", k: "complete deliver drop proof signature photo finish",
          answer: `At drop-off, open the job and add up to 5 delivery photos, the recipient's name and their signature, then submit. ✍️ That completes the job and starts your payment.` },
        { label: "Can I message the sender?", k: "chat contact message sender",
          answer: `Yes. Use the chat on your job once you've accepted it. 💬` },
      ]
    },

    traveler_help: {
      message: `I'm here to help. What's going on?`,
      options: [
        { label: "How do I report or block someone?", k: "report block abuse harassment unsafe",
          answer: `Open the delivery chat and tap <strong>Report</strong>. 🚩 Choose a reason, add details, and tick <strong>Also block this person</strong> if you'd like. If you're ever in danger, call emergency services first.` },
        { label: "What if I suspect a prohibited item?", k: "suspicious illegal refuse package drugs",
          answer: `Don't accept the package. 🚫 Report it in the delivery chat, then contact our team: ${SUPPORT}` },
        { label: "I have a problem with a job or payout", k: "problem issue missing payment payout late support",
          answer: `Open <strong>Support</strong> in your account, or email us with your delivery details: ${SUPPORT}` },
        { label: "How do I delete my account?", k: "delete close remove account",
          answer: `Go to <strong>Account & Identity</strong>, scroll to <strong>Delete account</strong> and confirm your password. You'll need to finish any active deliveries first.` },
      ]
    },

  }; // end flow

  /* ── ENGINE ──────────────────────────────────────────── */
  function renderState(stateKey, pushHistory) {
    if (pushHistory === undefined) pushHistory = true;
    var state = flow[stateKey];
    if (!state) return;
    if (pushHistory) stateStack.push(stateKey);
    addBotMessage(state.message);
    qrPanel.innerHTML = "";
    if (state.options && state.options.length > 0) {
      state.options.forEach(function(opt) {
        var btn = document.createElement("button");
        btn.className = "alice-qr";
        btn.textContent = opt.label;
        btn.addEventListener("click", function() {
          addUserMessage(opt.label);
          if (opt.answer) {
            showTypingThen(function() { addBotMessage(opt.answer); renderNavButtons(stateKey); });
          } else if (opt.next) {
            showTypingThen(function() { renderState(opt.next); });
          }
        });
        qrPanel.appendChild(btn);
      });
    }
  }

  function renderNavButtons(currentStateKey) {
    qrPanel.innerHTML = "";
    if (stateStack.length > 1) {
      var backBtn = document.createElement("button");
      backBtn.className = "alice-qr alice-nav-btn";
      backBtn.textContent = "← Back";
      backBtn.addEventListener("click", function() {
        stateStack.pop();
        var prev = stateStack[stateStack.length - 1];
        stateStack.pop();
        renderState(prev);
      });
      qrPanel.appendChild(backBtn);
    }
    var menuBtn = document.createElement("button");
    menuBtn.className = "alice-qr alice-nav-btn";
    menuBtn.textContent = "🏠 Main Menu";
    menuBtn.addEventListener("click", function() {
      stateStack = [];
      showTypingThen(function() { renderState(START); });
    });
    qrPanel.appendChild(menuBtn);
    var anotherBtn = document.createElement("button");
    anotherBtn.className = "alice-qr alice-nav-btn";
    anotherBtn.textContent = "❓ Ask another";
    anotherBtn.addEventListener("click", function() {
      stateStack.pop();
      var prev = stateStack[stateStack.length - 1];
      stateStack.pop();
      renderState(prev);
    });
    qrPanel.appendChild(anotherBtn);
  }

  function addBotMessage(html) {
    var msg = document.createElement("div");
    msg.className = "alice-msg bot";
    msg.innerHTML = html;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function addUserMessage(text) {
    var msg = document.createElement("div");
    msg.className = "alice-msg user";
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTypingThen(callback) {
    var typing = document.createElement("div");
    typing.className = "alice-typing";
    typing.id = "alice-typing-indicator";
    typing.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    setTimeout(function() {
      var t = document.getElementById("alice-typing-indicator");
      if (t) t.remove();
      callback();
    }, 600 + Math.random() * 500);
  }

  function openAlice() {
    aliceWindow.classList.remove("alice-hidden", "alice-closing");
    document.body.classList.add("alice-open");
    fitVisibleScreen();
    isOpen = true;
    if (!hasOpened) {
      hasOpened = true;
      setTimeout(function() { renderState(START); }, 300);
    }
  }

  function closeAlice() {
    aliceWindow.classList.add("alice-closing");
    document.body.classList.remove("alice-open");
    isOpen = false;
    setTimeout(function() { aliceWindow.classList.add("alice-hidden"); }, 250);
  }

  document.addEventListener("click", function(event) {
    if (!event.target.closest("#openChatBtn, #chatToggleBtn, [data-open-alice]")) return;
    isOpen ? closeAlice() : openAlice();
  });

  closeBtn.addEventListener("click", closeAlice);

  // iPhones slide the page up for the keyboard, which would push the close
  // button off screen. On phones, keep Alice inside the part still visible.
  const phone = window.matchMedia("(max-width: 768px)");

  function fitVisibleScreen() {
    const screen = window.visualViewport;

    aliceWindow.style.top = phone.matches ? `${screen.offsetTop}px` : "";
    aliceWindow.style.height = phone.matches ? `${screen.height}px` : "";
  }

  window.visualViewport.addEventListener("resize", fitVisibleScreen);
  window.visualViewport.addEventListener("scroll", fitVisibleScreen);
  sendBtn.addEventListener("click", function() { handleFreeText(inputEl.value); });
  inputEl.addEventListener("keydown", function(e) { if (e.key === "Enter") handleFreeText(inputEl.value); });

  // Finds the best answer to a typed question across every topic.
  const STOP = new Set("a an and are at be can could do does for from get got has have how i im in is it its me my of on or our so that the this to was what when where which who why will with would you your need needs want much many please tell about".split(" "));

  function words(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function(word) {
      return word.length > 1 && !STOP.has(word);
    });
  }

  const answers = [];

  Object.keys(flow).forEach(function(key) {
    (flow[key].options || []).forEach(function(option) {
      if (option.answer) {
        answers.push({
          answer: option.answer,
          stateKey: key,
          terms: new Set(words(option.label + " " + (option.k || "")))
        });
      }
    });
  });

  function matches(word, term) {
    return word === term || (word.length > 3 && term.length > 3 && (word.startsWith(term) || term.startsWith(word)));
  }

  // Rare words count for more, so "gun" outweighs a common word like "package".
  function termWeight(term) {
    const count = answers.filter(function(entry) { return entry.terms.has(term); }).length;
    return 1 / Math.max(count, 1);
  }

  function findAnswer(text) {
    const asked = words(text);
    let best = null;
    let bestScore = 0;

    answers.forEach(function(entry) {
      let score = 0;

      asked.forEach(function(word) {
        let wordScore = 0;

        entry.terms.forEach(function(term) {
          if (matches(word, term)) wordScore = Math.max(wordScore, termWeight(term));
        });

        score += wordScore;
      });

      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });

    return bestScore >= 0.3 ? best : null;
  }

  function handleFreeText(text) {
    text = text.trim();
    if (!text) return;

    addUserMessage(text);
    inputEl.value = "";

    if (/^(hi|hello|hey|hola|bonjour|start|menu)\b/i.test(text)) {
      showTypingThen(function() { stateStack = []; renderState(START); });
      return;
    }

    const found = findAnswer(text);

    showTypingThen(function() {
      if (found) {
        stateStack = [found.stateKey];
        addBotMessage(found.answer);
        renderNavButtons(found.stateKey);
        return;
      }

      addBotMessage("I'm not sure about that one, but our team can help! 😊<br><br>" + SUPPORT);
      stateStack = [];
      renderNavButtons("greeting");
    });
  }

})();
