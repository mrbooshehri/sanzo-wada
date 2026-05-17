# Sanzo Wada Atlas

A modern color browser for the [Sanzo Wada](https://en.wikipedia.org/wiki/Sanzo_Wada) palette — the classic 1930s Japanese color studies behind *A Dictionary of Color Combinations*. Runs fully offline from local data, with no external API dependencies.

Available as a **web app** (Docker + nginx) and an **Android APK** (Capacitor). Everything builds inside Docker — no Node, Android Studio, or SDK needed on your machine.

---

## Features

- Browse all 157 colors and 348 combinations from the local dataset
- Search across name, hex, RGB, CMYK, and combination IDs
- Sort by book order, most used, or name A–Z
- Grid and list view toggle
- Color detail page with RGB, CMYK, slug, use count, and combination previews
- **Long-press** any color swatch to copy its hex code
- **Tap** hex badge pills to copy instantly
- Light / dark theme, persisted across sessions
- Fully offline — all data is bundled in the container / APK

---

## Project Structure

```
.
├── app.js                  # All SPA logic (routing, rendering, state)
├── style.css               # Styles and themes
├── index.html              # Shell + <template> tags for each route
├── manifest.json           # Web app manifest (name, icons, theme)
├── icon.svg                # Source icon — change this to rebrand everything
├── generate-favicon.mjs    # Generates favicon-*.png from icon.svg
├── generate-icons.mjs      # Generates Android mipmap PNGs from icon.svg
├── data/
│   ├── colors.json
│   └── combinations.json
├── Dockerfile              # Multi-stage: generates favicons → nginx
├── Dockerfile.apk          # Multi-stage: Capacitor → Gradle → APK
├── docker-compose.yml      # Web app service (port 8080)
├── nginx.conf              # SPA routing + cache headers
├── capacitor.config.json   # Capacitor app ID and web dir
└── package.json            # Capacitor + sharp dependencies
```

---

## Web App

### Run (development)

```bash
docker compose up --build
```

Open **http://localhost:8080**.

The nginx container serves the app with SPA routing (`try_files` fallback) and sensible cache headers — no-store for HTML/JS/CSS, 7-day cache for data files.

### Rebuild after changes

```bash
docker compose build && docker compose up -d
```

---

## Android APK

All Android tooling runs inside Docker. You need nothing installed locally except Docker.

### Build

```bash
docker build --network=host -f Dockerfile.apk --target artifact --output . .
```

This drops `sanzo-wada.apk` into the current directory.

> **`--network=host` is required** so the Gradle build can reach Maven repositories through your host network / VPN.

### What the build does

| Stage | Image | Job |
|---|---|---|
| `capacitor` | `node:20-alpine` | Installs Capacitor, generates Android project, generates favicon & launcher PNGs from `icon.svg`, runs `cap sync` |
| `builder` | `mobiledevops/android-sdk-image:34.0.0` | Runs Gradle with JDK 17 (borrowed from `eclipse-temurin:17`), downloads dependencies, compiles the APK |
| `artifact` | `scratch` | Extracts only the APK — nothing else |

First build takes ~15 minutes (Gradle downloads dependencies). Subsequent builds use Docker layer caching and finish in under a minute if only web assets changed.

### Install on device

```bash
# via ADB
adb install sanzo-wada.apk

# or copy the file to your phone and open it
# (enable "Install from unknown sources" in Android settings)
```

---

## Customising the Icon

Replace `icon.svg` with your own SVG, then rebuild. Both the favicon and Android launcher icons are auto-generated from it.

**What gets generated:**

| File | Size | Used for |
|---|---|---|
| `favicon-16.png` | 16×16 | Browser tab fallback |
| `favicon-32.png` | 32×32 | Browser tab fallback |
| `favicon-180.png` | 180×180 | iOS home screen (apple-touch-icon) |
| `favicon-192.png` | 192×192 | Android Chrome / manifest |
| `favicon-512.png` | 512×512 | PWA splash screen |
| `mipmap-*/ic_launcher.png` | 48→192px | Android launcher icon |
| `mipmap-*/ic_launcher_round.png` | 48→192px | Android round launcher icon |
| `mipmap-*/ic_launcher_foreground.png` | 108→432px | Android adaptive icon foreground |

To change the app name, theme colour, or background colour, edit `manifest.json` and `capacitor.config.json`.

---

## Tech Stack

- **Vanilla JS** (ES modules, no framework, no build step for the web app)
- **nginx 1.27** for serving
- **Capacitor 6** for Android packaging
- **Gradle 8.2.1** + **Android SDK 34** for the APK
- **sharp** for SVG → PNG icon generation (runs only at build time)
- Everything orchestrated with **Docker multi-stage builds**
