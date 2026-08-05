// pages/[lang]/index.js
import { useRouter } from "next/router";
import { useI18n } from "../../context/I18nContext";

export default function Home() {
  const router = useRouter();
  const { lang } = router.query;
  const { t } = useI18n();

  return (
    <div>
      <h1>{t("welcome")}</h1>
      <p>{t("delivery.track")}</p>
    </div>
  );
}
