// utils/getUserLanguage.js
import { detectBrowserLanguage } from "./detectLanguage";

export function getUserLanguage() {
  if (typeof window === "undefined") return "en";

  const saved = localStorage.getItem("flexago_lang");
  return saved || detectBrowserLanguage();
}

export function setUserLanguage(lang) {
  localStorage.setItem("flexago_lang", lang);
}
