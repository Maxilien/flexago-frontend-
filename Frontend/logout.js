function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("senderId");
  localStorage.removeItem("senderEmail");
  localStorage.removeItem("travelerId");
  localStorage.removeItem("authToken");

  window.location.href = "login.html";
}