# FlexaGo iOS app

The app packages the web app in `../Frontend` using Capacitor. Web pages are
edited in `../Frontend`, never in `www/` or `ios/App/App/public/`.

## Setup

Requires Node 22 or newer and Xcode.

    npm install
    npm run sync
    npm run open

`npm run sync` rebuilds `www/` and copies it into the iOS project. Run it after
any change in `../Frontend`. `npm run open` opens the project in Xcode.

## What ships in the app

`scripts/build-web.js` lists the pages and scripts included. Add a new page to
its `PAGES` list, or it won't be in the app.

Icons and live tracking scripts are bundled from `node_modules`. Google Maps and
Stripe.js still load from their own servers, as their terms require.

## App details

- Bundle ID: `com.flexagoo.app`, set in `capacitor.config.json` and in Xcode
- iPhone only, portrait only
- App icon and launch screen: `ios/App/App/Assets.xcassets`
- Permission messages: `ios/App/App/Info.plist`
