const chatInput = document.getElementById("chatInput");
const chatLog = document.getElementById("chatLog");

chatInput.addEventListener("keypress", async (e) => {
  if (e.key === "Enter") {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    chatLog.innerHTML += `<div>🧑 ${userMessage}</div>`;
    chatInput.value = "";

    try {
      const response = await fetch("https://flexago-backend.onrender.com/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      chatLog.innerHTML += `<div>🤖 ${data.reply}</div>`;
    } catch (err) {
      chatLog.innerHTML += `<div>❌ Unable to reach FlexaGo Support Server.</div>`;
    }
  }
});
