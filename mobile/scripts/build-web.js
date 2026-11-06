// Copies only the pages the app needs from ../Frontend into www/,
// and swaps CDN scripts for bundled copies so the app doesn't depend on them.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const source = path.join(root, "..", "Frontend");
const output = path.join(root, "www");

const PAGES = [
  "index", "login", "signup", "verify-email", "verify-phone",
  "verify-identity", "verify-stripe", "create-account", "background-check", "Sender", "traveler"
];

const SCRIPTS = [
  "i18n.js", "i18n-extra.js", "login.js", "logout.js", "onboarding.js",
  "sender.js", "traveler.js", "js", "css", "IMG"
];

const VENDOR = {
  "lucide.js": "node_modules/lucide/dist/umd/lucide.min.js",
  "socket.io.min.js": "node_modules/socket.io-client/dist/socket.io.min.js"
};

const CDN_SCRIPTS = [
  [/https:\/\/unpkg\.com\/lucide@[^"]+/g, "vendor/lucide.js"],
  [/https:\/\/cdn\.socket\.io\/[^"]+/g, "vendor/socket.io.min.js"]
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, "vendor"), { recursive: true });

for (const item of SCRIPTS) {
  fs.cpSync(path.join(source, item), path.join(output, item), { recursive: true });
}

for (const [name, file] of Object.entries(VENDOR)) {
  fs.copyFileSync(path.join(root, file), path.join(output, "vendor", name));
}

for (const page of PAGES) {
  let html = fs.readFileSync(path.join(source, `${page}.html`), "utf8");

  for (const [pattern, local] of CDN_SCRIPTS) {
    html = html.replace(pattern, local);
  }

  fs.writeFileSync(path.join(output, `${page}.html`), html);
}

console.log(`Built ${PAGES.length} pages into www/`);
