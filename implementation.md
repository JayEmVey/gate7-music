# Gate 7 Coffee Roastery Soundstage — Technical Implementation Guide

This document captures the architectural decisions, design philosophy, component hierarchy, state management, and iterative enhancements implemented in the **Gate 7 Coffee Roastery Soundstage** web application.

---

## 1. Executive Summary & Aesthetic Archetype

**Gate 7 Coffee Roastery Soundstage** is an interactive, digital soundstage and flavor pairing experience for the specialty coffee roastery Gate 7 (Hanoi, Vietnam). The application bridges the sensory worlds of specialty coffee roasting and curated acoustic frequencies, embodying the brand's core concept:
> *"Every flavor note of specialty coffee is amplified by matching sound frequencies. Discover the ideal pairing for your cup."*

### Design Language
- **Neo-Brutalist Specialty Aesthetic**: High-contrast black outlines (`border-2`, `border-4`), sharp corners, tactile physical depth shadows (`shadow-brutal`), vintage label stickers (`sticker-rotate-1`, `sticker-rotate-2`), and mono-spaced technical badges.
- **Color Palette**:
  - **Dark Soundstage Mode**: Deep matte charcoal (`#0D0D0E`), elevated surface card containers (`#18181C`), accented by Gate 7's signature roasted gold (`#FEBC11`) and emerald live indicator lights (`#10B981`).
  - **Light Coffee Roastery Mode**: Organic warm parchment cream (`#F4F1EA` / `#FFFDF0`), pure white surface cards, pitch-black typography and borders, with rich honey-amber accents.
- **Typography**: Paired display and technical fonts using *Plus Jakarta Sans* with strict mathematical typographic hierarchy and high baseline contrast.

---

## 2. Key Components & Implementation Details

### 2.1 Header Navigation (`/src/components/Header.tsx`)
- **Gentle Brand Placement**: The official Gate 7 logo is placed gently and organically onto the page without harsh boxed enclosures or borders, using smart blend modes (`mix-blend-screen` on dark backgrounds, `mix-blend-multiply` on light backgrounds) for seamless integration with the header.
- **Live Soundstage Marquee Ticker**: An animated continuous marquee ribbon displaying the current roastery sound status, ambient noise level (72dB), and current station broadcast.
- **Language Switcher (VI / EN)**: Segmented control toggling all interface text between Vietnamese and English.
- **Theme Mode Switcher (Tối / Sáng)**: Interactive switch between the dark acoustic mood and warm light mood.
- **Sonic Pairings Quick Badge**: Houses the animated coffee bean & music note hugging avatar with an active pulse indicator and direct trigger for the Pairing Guide modal.

### 2.2 Sonic Pairing Hugging Animation (`/src/components/SonicPairingG7Icon.tsx`)
Replacing traditional static icons, this component introduces an animated SVG character pair:
- **The Coffee Bean Character**: Rendered in warm roasted brown hues (`#78350F`, `#92400E`) with its characteristic curved center crease, warm eyes, and blushing smile.
- **The Music Note Character**: Rendered as an eighth note (♪ quaver) in radiant Gate 7 gold (`#FEBC11`) with rounded musical head and stem, leaning into the coffee bean.
- **Interactive Hugging Motion**:
  - `animate-hug-sway`: A gentle rhythmic pendulum sway (3s alternating loop) representing acoustic harmony.
  - `animate-hug-pulse`: A synchronized breathing expansion.
  - `animate-heart-float`: Floating pastel-red hearts drifting upwards.
  - Coffee steam trails wafting up from the coffee bean.
  - Concentric golden acoustic ripples radiating outward.

### 2.3 Soundstage Hero Section (`/src/components/SoundstageHero.tsx`)
- **Square Spotify Song Thumbnail (Image 1 Style)**: Framed in a bold 4px neo-brutalist border with high-contrast drop shadow, featuring curated album covers (such as the featured *Mats & My Bossa Nova Covers*).
- **Interactive Equalizer Animation**:
  - 5-channel animated equalizer bar sticker (`animate-equalizer-1` through `animate-equalizer-5`) bouncing synchronously with the playback state.
  - Pulsing live broadcast LED indicator (`ĐANG PHÁT` / `NOW PLAYING`).
  - Subtle sound frequency visualizer strip along the bottom rim of the cover.
  - Interactive hover overlay for quick play/pause toggling.
- **Track Metadata & Barista Pairing**: Displays track title, artist, album, genre tag, and the designated coffee pairing (e.g. *Cold Brew Cam Vàng & V60 Pour-over*).
- **Core Transport Controls**: Large play/pause toggle button, track skip buttons, live scrub bar with current time/duration display, and interactive action buttons (Heart favorite, Share, and Song Request modal).
- **Sonic Flavor Pairings Spotlight Banner**: Direct interactive callout connecting the currently playing acoustic frequencies with taste sensations.

### 2.4 Playlist Schedule Grid (`/src/components/PlaylistGrid.tsx`)
- **5 Curated Time Sessions**:
  1. `07:00 – 09:00`: *Morning Gentle Bloom* (Acoustic Folk & Slow Morning Vocals)
  2. `09:00 – 11:00`: *Bossa Nova & Indie Acoustic* (Bossa Nova & Chill Coffee Beats — Current Slot)
  3. `11:00 – 14:00`: *Roastery Hustle & Lo-Fi* (Instrumental Lo-Fi, Chillhop, Beat Tape)
  4. `14:00 – 17:00`: *Golden Afternoon Jazz* (Bebop, Soul Jazz & Smooth Melodies)
  5. `17:00 – 22:00`: *Blue Twilight Acoustic* (Indie Pop, Neo-Soul & Candlelight Chords)
- **Interactive Playlist Cards**: Shows track counts, duration, and status with interactive modal inspection to view full tracklists and change the currently playing song.

### 2.5 Multi-Zone Speaker & Queue Sidebar (`/src/components/SidebarRight.tsx`)
- **Multi-Zone Speaker Router**: Allows selecting playback destination:
  - `Quầy Bar Roastery` (Barista Bar)
  - `Không Gian Tầng 2` (Second Floor Work & Study Zone)
  - `Sân Vườn Ngoài Trời` (Outdoor Garden Terrace)
  - `Gate 7 Main Loa` (Main Floor Soundstage)
- **Live Soundstage Decibel Meter**: Real-time animated sound pressure monitor with dynamic bar heights and peak warnings (~72dB ideal coffeehouse ambient level).
- **Community Song Request Queue**: Displays guest-requested tracks with real-time upvoting, requester names, dedicated note messages, and status badges (`Đang phát`, `Kế tiếp`, `Chờ duyệt`).
- **Barista's Taste Pick**: Daily specialty drink recommendation synchronized with the soundstage vibe.

### 2.6 Persistent Bottom Audio Bar (`/src/components/BottomPlayer.tsx`)
- **Square Album Art with Mini Equalizer**: Square thumbnail with a 4-bar dynamic equalizer badge that bounces during playback.
- **Playback Scrubber**: Scrub slider showing elapsed vs. total seconds with drag-to-seek support.
- **Volume & Speaker Controls**: Real-time volume slider, mute toggle, speaker zone switcher, and full track detail modal trigger.

### 2.7 Interactive Modals & Spotify Integration
- **Gate 7 Spotify Auto-Authentication (`/src/utils/spotify.ts`)**:
  - Automatically connects to the Spotify Web API on page load using Gate 7 Coffee Roastery's Client ID (`be83df152a954a5fbe64cd9f065cb832`) and Client Secret (`eabdc8fb352a4504aab3e1379d8ad6a5`).
  - Employs the OAuth 2.0 Client Credentials flow (`https://accounts.spotify.com/api/token`) with token caching and fallback resilience.
  - Automatically prepares the "Now Playing" broadcast on load with zero manual sync steps required.
  - Removed obsolete "Spotify Sync" buttons across the application in favor of persistent, automatic connection indicators.
- **Spotify Chooser Modal (`SpotifyChooserModal.tsx`)**:
  - Activated when a guest clicks "Open Spotify" on any track, playlist card, or in the bottom player bar.
  - Prompts the user with an intuitive choice:
    1. **Mở trong ứng dụng Spotify (Desktop App)**: Direct launch via deep URI scheme (`spotify:track:...` or `spotify:playlist:...`).
    2. **Mở trong trình duyệt web (Web Browser)**: Standard link opening `https://open.spotify.com/...` in a new tab.
    3. **Sao chép liên kết (Copy Link)**: One-click clipboard copy with animated visual feedback.
- **Song Request Modal (`RequestModal.tsx`)**: Allows customers in the coffee shop to request songs with artist name, Spotify link, guest note, and coffee pairing choice.
- **Sonic Flavor Pairing Guide Modal (`PairingGuideModal.tsx`)**: Detailed explanation of frequency-to-taste theory:
  - High Frequencies (Treble) → Elevates bright fruity acidity (Citrus, Floral, Jasmine).
  - Mid Frequencies (Mids) → Balances body, sweetness, and caramel notes.
  - Low Frequencies (Bass) → Amplifies deep roasted cacao, dark chocolate, and roasted nut undertones.
- **Playlist Detail Modal (`PlaylistDetailModal.tsx`)**: Full tracklist viewer with instant song selection and direct per-track & per-playlist "Open Spotify" triggers.

---

## 3. Audio Engine & Simulation

To provide realistic audio feedback without requiring external streaming credentials:
- Uses the **HTML5 Web Audio API** via `AudioContext` and `OscillatorNode`.
- When playback is toggled, a procedural, mellow acoustic chime and harmonic undertone plays to confirm audio engagement.
- Internal timers track elapsed playback seconds, advancing the seek slider and updating timestamps in real time.
- Equalizer animations and vinyl disc states are tied directly to the `isPlaying` boolean state flag.

---

## 4. Key Refactorings & Iteration History

1. **Brand Identity Integration**:
   - Updated logo to Gate 7's official web asset (`https://gate7.vn/images/logo-color-black-bg1-large.webp` and `logo-color-white-bg1.webp`).
   - Removed boxed container and heavy border around the logo; embedded it naturally with CSS blend modes.
2. **Sonic Flavor Pairings Animated Mascot**:
   - Replaced static badge with an SVG animated scene of a coffee bean hugging a music note (♪) with gentle swaying, steam trails, and floating hearts.
3. **Soundstage Hero Redesign**:
   - Removed circular vinyl spinning discs per customer guidance.
   - Introduced a square Spotify album thumbnail with high-contrast borders, drop shadows, and live equalizer audio wave animations.
   - Added the artwork for *Mats & My Bossa Nova Covers* generated to match the requested cover reference.
4. **Theme Harmonization**:
   - Implemented full bidirectional light/dark mode support with persistent Tailwind styling across all components, modals, and sticky player bars.
5. **Automated GitHub Pages Deployment Pipeline**:
   - Implemented `.github/workflows/deploy.yml` configured to trigger on any commit/push to the `master` branch.
   - Built a two-stage CI/CD pipeline (`build` and `deploy`) using GitHub's official `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, and `actions/deploy-pages@v4`.
   - Added `public/CNAME` configured to `music.gate7.vn` so Vite automatically copies the custom domain configuration to `dist/CNAME` during builds, preserving the custom domain on every automated deployment.
   - Configured `base: './'` in `vite.config.ts` for relative asset referencing across both root domains and GitHub Pages deployment targets.
6. **Spotify Auto-Authentication & Chooser Modal**:
   - Integrated Gate 7 Coffee Client ID & Client Secret via OAuth 2.0 Client Credentials flow directly on application mount.
   - Removed redundant "Spotify Sync" manual buttons; status indicator in header displays "Gate 7 Spotify Connected".
   - Created `SpotifyChooserModal` enabling guests to open songs/playlists either in the desktop Spotify app (`spotify://`) or in a new browser tab (`https://open.spotify.com`).
   - Integrated playlist and track mapping dataset matching the reference `index.html` structure.

---

## 5. CI/CD & Deployment Pipeline Architecture

### 5.1 Workflow Configuration (`/.github/workflows/deploy.yml`)
- **Trigger**:
  - Automatically triggered upon `git push` to the `master` branch (`branches: [master]`).
  - Supports manual triggers via `workflow_dispatch`.
- **Permissions**:
  - `contents: read`
  - `pages: write`
  - `id-token: write`
- **Concurrency Control**:
  - Concurrency group `pages` with `cancel-in-progress: false` to ensure atomic, sequential deployments without collision.
- **Pipeline Stages**:
  1. **Build Job (`build`)**:
     - Runs on `ubuntu-latest`.
     - Clones repository via `actions/checkout@v4`.
     - Sets up Node.js 20 with automatic npm dependency caching (`actions/setup-node@v4`).
     - Executes clean dependency installation (`npm ci || npm install`).
     - Runs static production bundling (`npm run build`).
     - Configures GitHub Pages settings via `actions/configure-pages@v5`.
     - Packages and uploads `./dist` via `actions/upload-pages-artifact@v3`.
  2. **Deployment Job (`deploy`)**:
     - Deploys directly to the `github-pages` environment with URL output tracking.
     - Uses `actions/deploy-pages@v4`.

### 5.2 Custom Domain Management
- **Domain**: `music.gate7.vn`
- **Mechanism**: The file `/public/CNAME` contains `music.gate7.vn`. When Vite compiles the application to `./dist`, it automatically carries over `CNAME` into the root of the distribution bundle, ensuring GitHub Pages never drops the custom domain setting after automated builds.

