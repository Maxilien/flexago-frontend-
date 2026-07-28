// 🌐 Handle language selection
const languageSelector = document.getElementById("languageSelector");
if (languageSelector) {
  languageSelector.addEventListener("change", (e) => {
    const selectedLang = e.target.value;
    localStorage.setItem("preferredLanguage", selectedLang);
  });
}

// 🚀 Handle Next button by click
const nextBtn = document.getElementById("nextBtn");
if (nextBtn) {
  nextBtn.addEventListener("click", signup);
}

async function signup() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();

  // 🧩 Basic validation
  if (!firstName || !lastName) {
    alert("Please fill out all fields.");
    return;
  }

  // 💾 Store temporary user info before role selection
  localStorage.setItem("tempFirstName", firstName);
  localStorage.setItem("tempLastName", lastName);

  // 📝 Store timestamp (helps with A2P compliance logs if needed later)
  localStorage.setItem("signupTimestamp", Date.now().toString());

  // 🔄 Redirect to create-account page (role selection happens there)
  window.location.href = "verify-email.html";
}
