import { useRouter } from "next/router";

export function I18nProvider({ children }) {
  const router = useRouter();
  const urlLang = router.query.lang;

  const [t, setT] = useState(() => (key) => key);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const finalLang = urlLang || getUserLanguage();

    loadTranslations(finalLang).then(({ lang, t }) => {
      setLang(lang);
      setT(() => t);
    });
  }, [urlLang]);

  return (
    <I18nContext.Provider value={{ t, lang }}>
      {children}
    </I18nContext.Provider>
  );
}
