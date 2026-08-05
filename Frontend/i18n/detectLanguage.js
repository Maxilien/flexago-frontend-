// utils/detectLanguage.js
export function detectBrowserLanguage() {
  if (typeof window === "undefined") return "en";

  const lang = navigator.language.split("-")[0];
  const supported = ["en", "fr", "es", "de"];

  return supported.includes(lang) ? lang : "en";
}
