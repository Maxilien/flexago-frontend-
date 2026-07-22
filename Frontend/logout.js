function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("senderId");
  localStorage.removeItem("senderEmail");

  window.location.href = "login.html";
}