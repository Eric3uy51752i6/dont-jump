# DON’T JUMP

Official website and playable browser build for **DON’T JUMP — One Button. Bad Decisions.**

## Structure

- `index.html` — premium responsive game website
- `game/index.html` — full 100-level browser game
- `support.html` — support and troubleshooting
- `privacy.html` — web-version privacy disclosures
- `404.html` — custom GitHub Pages error page
- `manifest.webmanifest` and `sw.js` — installable PWA shell
- `assets/` — site styles, scripts, icons, and social preview

The site is intentionally dependency-free and uses relative URLs so it works under the GitHub Pages `/dont-jump/` project path.

The browser build uses a simulated rewarded-ad flow. Native AdMob is reserved for the future iOS app.
