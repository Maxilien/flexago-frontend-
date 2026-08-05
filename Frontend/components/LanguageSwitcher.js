// components/LanguageSwitcher.js
import { useRouter } from "next/router";
import { setUserLanguage } from "../utils/getUserLanguage";

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLang = router.query.lang || "en";

  function changeLang(e) {
    const lang = e.target.value;
    setUserLanguage(lang);
    router.push(`/${lang}`);
  }

  return (
    <select onChange={changeLang} value={currentLang}>
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="es">Español</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
