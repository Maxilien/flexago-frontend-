import { useI18n } from "../context/I18nContext";

export default function Home() {
  const { t } = useI18n();

  return (
    <div>
      <h1>{t("welcome")}</h1>
      <button>{t("delivery.track")}</button>
      <button>{t("driver.accept")}</button>
    </div>
  );
}
