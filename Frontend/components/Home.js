const res = await fetch("/translate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "Your delivery is arriving soon.",
    targetLanguage: lang
  })
});

const { translatedText } = await res.json();
