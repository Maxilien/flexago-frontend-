function logout() {
  Flexago.clearSession();
  Flexago.go("login");
}
