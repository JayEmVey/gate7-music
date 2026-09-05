# Gate 7 Coffee Roastery Soundstage ☕ 🎵

An interactive, neo-brutalist web application connecting specialty coffee roasting with curated acoustic soundscapes for **Gate 7 Coffee Roastery**

---

## 1. Business Requirements

### 1.1 Background & Brand Concept
Gate 7 is a coffee roastery dedicated to artisanal bean sourcing, precision roasting, and experiential cafe atmosphere. The Soundstage platform embodies the core roastery philosophy:

> **"Gate 7 Sonic Flavor Pairings"**  
> *Every flavor note of specialty coffee is amplified by matching sound frequencies. Discover the ideal pairing for your cup.*

### 1.2 Core Business Objectives
1. **Sonic Flavor Pairings**: Guide guests to discover how sound frequencies (bright treble, warm mids, deep bass) complement specific coffee flavor notes (citrus acidity, caramel sweetness, roasted chocolate).
2. **In-Store Live Playlist Curation**: Deliver scheduled, time-slotted music sets tailored to the daily rhythm of the roastery:
   - **07:00 – 09:00**: Morning Gentle Bloom (Folk & Slow Acoustic)
   - **09:00 – 11:00**: Bossa Nova & Indie Acoustic (Chill Roastery Beats)
   - **11:00 – 14:00**: Roastery Hustle & Lo-Fi (Focus & Chillhop)
   - **14:00 – 17:00**: Golden Afternoon Jazz (Bebop & Soul Melodies)
   - **17:00 – 22:00**: Blue Twilight Acoustic (Indie Pop & Neo-Soul)
3. **Multi-Zone Speaker Router**: Enable cafe staff and guests to target playback to specific zones (Quầy Bar, Không Gian Tầng 2, Sân Vườn Ngoài Trời, Main Loa).
4. **Live Sound Pressure (dB) Monitor**: Monitor ambient cafe acoustic volume around ~72dB for ideal conversational and sensory comfort.
5. **Community Song Request Queue**: Allow in-store guests to submit song requests with personalized notes, coffee pairings, and community upvoting.
6. **Bilingual Support (VI / EN)**: Seamlessly toggle between Vietnamese and English for local and international coffee lovers.
7. **Dual Mood System (Tối / Sáng)**: Provide high-contrast Dark Soundstage and warm Light Roastery color themes.

---

## 2. Technology Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom neo-brutalist styling, CSS keyframe animations, and custom typography
- **Typography**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) via Google Fonts
- **Iconography**: [Font Awesome 6](https://fontawesome.com/) + [Lucide React](https://lucide.dev/)
- **Audio Synthesis & Audio Feedback**: HTML5 Web Audio API (`AudioContext`, `OscillatorNode`)
- **Animations**: CSS3 hardware-accelerated animations (`animate-hug-sway`, `animate-hug-pulse`, `animate-equalizer-1..5`, `animate-marquee`, `animate-heart-float`)
- **Backend / Deployment Support**: [Express 4](https://expressjs.com/) + [esbuild](https://esbuild.github.io/) / [tsx](https://github.com/privatenumber/tsx)

---

## 3. Project Structure

```
├── .env.example                     # Environment variables specification
├── index.html                       # Application HTML entry point & font links
├── metadata.json                    # AI Studio applet metadata & capabilities
├── package.json                     # Dependencies, scripts, and package manifests
├── tsconfig.json                    # TypeScript compiler configuration
├── tsconfig.node.json               # TypeScript config for Node/Vite scripts
├── vite.config.ts                   # Vite bundler configuration
├── implementation.md                # Detailed technical implementation document
├── README.md                        # Complete project overview & instructions
│
└── src/
    ├── main.tsx                     # React application entry point
    ├── App.tsx                      # Root layout, state orchestration, modals
    ├── index.css                    # Tailwind CSS imports and custom animation keyframes
    ├── types.ts                     # TypeScript data models and interfaces
    ├── data.ts                      # Initial track datasets, playlists, and presets
    ├── vite-env.d.ts                # Vite image and asset type declarations
    │
    ├── assets/
    │   └── images/
    │       └── bossa_nova_cover_*.jpg # Mats & My Bossa Nova Covers artwork
    │
    └── components/
        ├── Header.tsx               # Header with brand logo, marquee ticker, controls
        ├── SoundstageHero.tsx       # Main player stage with square Spotify cover & equalizers
        ├── SonicPairingG7Icon.tsx   # Coffee bean & music note hugging animation component
        ├── PlaylistGrid.tsx         # Time-slot schedule cards and tracklists
        ├── SidebarRight.tsx         # Multi-zone speaker router, decibel meter & request queue
        ├── BottomPlayer.tsx         # Persistent bottom audio bar with mini equalizer & Spotify launcher
        ├── PairingGuideModal.tsx    # Sonic flavor pairing philosophy modal
        ├── RequestModal.tsx         # In-store guest song request form
        ├── SpotifyChooserModal.tsx  # Modal for selecting Spotify Web Player vs. Desktop App
        └── PlaylistDetailModal.tsx  # Full playlist track inspection dialog with Spotify actions
```

---

## 4. Implementation Plan & Evolution

The development progressed through targeted functional and visual milestones:

1. **Phase 1: Architecture & Theme Foundation**
   - Established the neo-brutalist design system with high-contrast borders, tactile drop shadows, and responsive layout.
   - Built dual theme support (Dark Soundstage `#0D0D0E` and Light Roastery `#F4F1EA`).
   - Implemented full Vietnamese and English localization.

2. **Phase 2: Soundstage Experience & Schedule Engine**
   - Developed the 5 daily time slots with matching coffee pairings.
   - Built the multi-zone audio speaker selector and ambient sound pressure decibel meter.
   - Created the community song request queue with live upvoting.

3. **Phase 3: Brand Identity & Gentle Integration**
   - Connected Gate 7's official web logo assets.
   - Removed boxed containers and borders around the brand mark, allowing the logo to rest gently on the page with CSS blend modes.
   - Removed the legacy "Store Soundstage" box badge per user requirements.

4. **Phase 4: Sonic Pairing Mascot Animation**
   - Designed a custom vector animation in `SonicPairingG7Icon.tsx` depicting a warm roasted coffee bean character and a golden eighth note (♪) embracing in a rhythmic hug.
   - Added aroma steam wafts, floating hearts, and acoustic ripple waves.

5. **Phase 5: Spotify Square Thumbnail & Equalizer Transition**
   - Removed circular spinning vinyl discs and tonearm needles per feedback.
   - Replaced with a bold, square Spotify song thumbnail frame with neo-brutalist styling.
   - Integrated the illustrated *Mats & My Bossa Nova Covers* artwork.
   - Implemented dynamic 5-channel animated equalizer bars and live broadcast status indicators.

6. **Phase 6: Gate 7 Spotify Auto-Authentication & Chooser Modal**
   - Integrated automatic client credentials authentication on page load using Gate 7 Coffee Roastery's credentials.
   - Preloaded the "Now Playing" broadcast with active metadata and time-synchronized playback.
   - Removed the manual "Spotify Sync" button from the header and bottom player.
   - Added `SpotifyChooserModal` allowing visitors to choose between opening links directly in the Spotify Desktop App (`spotify://`) or in a new Web browser tab (`https://open.spotify.com`), with one-click URL copying.

---

## 5. Building, Deployment & Starting Instructions

### 5.1 Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher

### 5.2 Installation
Clone or open the repository and install all required dependencies:
```bash
npm install
```

### 5.3 Local Development
Start the local Vite development server:
```bash
npm run dev
```
The server starts at `https://127.0.0.1:3000/`. Your browser may ask you to
accept Vite's locally generated development certificate on first use.

### 5.4 Spotify OAuth setup
In the Spotify Developer Dashboard, add this exact value to the app's **Redirect
URIs** list:

```
https://127.0.0.1:3000/
```

The scheme, host, port, path, and trailing slash must match exactly. Spotify
does not allow `localhost` as an OAuth callback; its supported local alternative
is the literal loopback IP above. The same value is provided in `.env.example` as
`VITE_SPOTIFY_REDIRECT_URI`; copy it into `.env.local` if you need a different
callback URL.

### 5.5 RapidAPI audio features

Spotify audio features are retrieved through Musicae's RapidAPI replacement.
Set `VITE_RAPIDAPI_KEY` in `.env.local` for local development, or provide it as
a deployment secret. The app sends the Spotify track ID to
`spotify-extended-audio-features-api.p.rapidapi.com/v1/audio-features/{trackId}`
and uses the returned energy, tempo, acousticness, instrumentalness, valence,
danceability, liveness, mode, and loudness metrics for sonic pairing.

### 5.6 Spotify playback and playlists

The browser player requires a Spotify Premium account and the scopes requested by
this app. Browsers block unprompted audio after a refresh, so playback state is
restored and resumes when the visitor presses **Play** once; autoplay cannot be
reliably bypassed.

Spotify Development Mode only returns playlist items for playlists owned by the
signed-in Spotify account or playlists where that account is a collaborator.
Replace the IDs in `public/music/playlists.json` with playlists owned by the
account used to sign in (or make that account a collaborator). Editorial/public
Spotify playlist IDs can still be displayed and opened in Spotify, but their
track lists are unavailable through this API mode.

### 5.7 Code Quality & Linting
Run TypeScript checks to verify type safety and ensure no compilation errors:
```bash
npm run lint
```

### 5.8 Production Build
Compile the application into static production assets:
```bash
npm run build
```
Compiled static assets are generated in the `dist/` directory.

### 5.8 Previewing the Production Build
Preview the compiled production bundle locally:
```bash
npm run preview
```

### 5.9 Automated GitHub Pages Deployment (CI/CD)
The project includes a fully automated GitHub Actions deployment pipeline configured in `/.github/workflows/deploy.yml`:

- **Automatic Trigger on Push**: Any commit or sync pushed to the `master` branch automatically triggers the workflow:
  ```bash
  git checkout master
  git add .
  git commit -m "Your update message"
  git push origin master
  ```
- **Pipeline Workflow Steps**:
  1. **Build Job**: Sets up Node.js 20, installs dependencies, compiles Vite static assets into `dist/`.
  2. **CNAME & Custom Domain Retention**: The repository includes `public/CNAME` configured with `music.gate7.vn`. When built, Vite places `CNAME` directly into `dist/`, ensuring GitHub Pages permanently maintains the custom domain `http://music.gate7.vn/`.
  3. **Deploy Job**: Deploys the built artifact to the `github-pages` environment using official GitHub Actions (`actions/deploy-pages@v4`).
- **GitHub Repository Settings Verification**:
  - In your GitHub Repository: Go to **Settings** > **Pages**.
  - Under **Build and deployment** > **Source**, ensure **GitHub Actions** is selected.
  - The custom domain is set to `music.gate7.vn` with DNS pointing to GitHub Pages.

### 5.10 Container / Cloud Deployment Alternative
This project can also be deployed to containerized platforms (e.g., Google Cloud Run, Vercel, Netlify, or Docker):
- The production build outputs directly to `dist/`.
- The local server configuration defaults to port `3000`.

---

## 6. License & Credits

- **Brand & Concept**: Gate 7 Coffee Roastery
- **Artwork**: Illustrated Mats & My Bossa Nova Covers cover art
- **Audio Synthesizer**: Web Audio API Procedural Tone Engine
