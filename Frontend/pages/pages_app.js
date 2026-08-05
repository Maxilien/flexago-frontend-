// pages/_app.js
import { I18nProvider } from "../context/I18nContext";

export default function App({ Component, pageProps }) {
  return (
    <I18nProvider>
      <Component {...pageProps} />
    </I18nProvider>
  );
}
