// utils/i18n.js
export async function loadTranslations(lang) {
  const supported = ["en", "fr", "es", "de"];
  const finalLang = supported.includes(lang) ? lang : "en";

  const common = await fetch(`/locales/${finalLang}/common.json`).then(r => r.json());
  const email = await fetch(`/locales/${finalLang}/email.json`).then(r => r.json());
  const error = await fetch(`/locales/${finalLang}/error.json`).then(r => r.json());

  const dictionary = { ...common, ...email, ...error };

  function t(path) {
    return path.split(".").reduce((obj, key) => obj?.[key], dictionary) || path;
  }

  return { lang: finalLang, t };
}
