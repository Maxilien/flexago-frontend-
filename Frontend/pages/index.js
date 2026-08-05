// pages/index.js
import { useEffect } from "react";
import { detectBrowserLanguage } from "../utils/detectLanguage";
import { useRouter } from "next/router";

export default function RedirectRoot() {
  const router = useRouter();

  useEffect(() => {
    const lang = detectBrowserLanguage();
    router.replace(`/${lang}`);
  }, []);

  return null;
}
