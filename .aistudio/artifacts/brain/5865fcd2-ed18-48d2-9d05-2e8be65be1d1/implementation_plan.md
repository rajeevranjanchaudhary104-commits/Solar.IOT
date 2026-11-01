# Personal Firebase Account Migration: Realtime Database & Cloud Firestore

A unified architecture to transition all Farm.IOT dashboard features (Security Surveillance, Solar Telemetry, Microgrid Controls, and AI Detection) to the user's personal Firebase project (`farmiotest`), featuring live dual-database synchronization, zero-expiration scoped security rules, and instant configuration management.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following confirmed decisions from your clarification step govern this implementation:

- **Confirmed Decision 1 (All-Feature Account Migration)**: Transition the entire dashboard—including live solar microgrid telemetry, security camera streams, intruder alerts, servo tracking, and relay controls—to connect directly to your personal Firebase project (`farmiotest`).
- **Confirmed Decision 2 (Dual Database Integration)**: Activate both **Firebase Realtime Database** (`https://farmiotest-default-rtdb.asia-southeast1.firebasedatabase.app`) and **Cloud Firestore** concurrently:
  - **Realtime Database**: High-speed, sub-second telemetry, live ESP32-CAM MJPEG/Base64 stream frames, servo angle tracking (`15°–165°`), and buzzer toggle signals.
  - **Cloud Firestore**: Persistent daily energy logs, historical intruder incident archives, alert logs, and system settings.
- **Confirmed Decision 3 (No-Expiration Scoped Security Rules)**: Eliminate the Firebase Console red security warning banner while preventing permission lockouts:
  - Scoped rules granting read/write access specifically to `/security_system` and `/solar_iot` without a 30-day timestamp expiration limit (`request.time < timestamp.date(...)`).
  - Pre-formatted 1-click copyable rules ready for your mobile and desktop Firebase Console for both Realtime Database (`database.rules.json`) and Cloud Firestore (`firestore.rules`).

---

### 1. Overview & Core Concept

Currently, the dashboard has built-in defaults for AI Studio testing, but your hardware (ESP32-CAM, NodeMCU microgrid, and Google Colab CPU vision script) runs under your personal Firebase project `farmiotest` with its Realtime Database in `asia-southeast1`.

By implementing a **Universal Firebase Configuration Manager**, the dashboard can run directly against your personal Firebase project with zero build breakage. You will be able to paste your web app credentials or toggle back to defaults at any time. All hardware sketches and Google Colab scripts will automatically adapt to your live project endpoints.

---

### 2. User Experience & Visual Design

#### A. Firebase Account Switcher & Connection Status in Header
- **Active Project Badge**: Displays a persistent indicator in the top header:
  - Green indicator: `Personal Firebase: farmiotest (asia-southeast1)` with active RTDB & Firestore sync status.
  - Quick action: "Firebase Project Settings" modal trigger button.
- **Project Credentials Onboarding Modal**:
  - One-click preset: **"Apply my Farmiotest Project (`farmiotest`)"** which pre-fills:
    - RTDB URL: `https://farmiotest-default-rtdb.asia-southeast1.firebasedatabase.app`
    - Project ID: `farmiotest`
    - Auth Domain: `farmiotest.firebaseapp.com`
  - Paste-in Box: Option to paste the standard `firebaseConfig` JavaScript/JSON object copied straight from **Firebase Console > Project settings > General > Your apps**.
  - **Live Ping & Connection Tester**: An interactive diagnostic button that tests read and write access to `/security_system/last_seen` in RTDB and `solar_iot/security_system` in Firestore, displaying a clear green checkmark when connection is confirmed.

#### B. Unified Security Rules Center (Mobile & Desktop Friendly)
- **Realtime Database Rules Panel**:
  - Displays the exact JSON rules that secure `/security_system` and `/solar_iot` while satisfying Google's security scanner (clearing the warning banner).
  - 1-Click "Copy RTDB Rules" button with mobile clipboard feedback.
- **Firestore Security Rules Panel**:
  - Displays the companion `firestore.rules` allowing authenticated and hardware device access without expiration dates.
  - 1-Click "Copy Firestore Rules" button.

#### C. Live Synchronized Firmware & Colab Code Generator
- **Google Colab CPU Vision Script**:
  - Automatically injects `FIREBASE_RTDB_URL = "https://farmiotest-default-rtdb.asia-southeast1.firebasedatabase.app"`.
  - Supports both Drive photo backup and Base64 live frames.
- **ESP32-CAM Arduino Sketch**:
  - Pre-populates your active database URL, Wi-Fi credentials placeholders, and servo/buzzer pinouts (GPIO 13 PIR, GPIO 14 SG90, GPIO 12 Buzzer).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Runtime Dynamic Multi-App Initialization vs Hardcoded Static Config**
  - *Chosen Approach*: Store personal Firebase credentials in browser `localStorage` with reactive state broadcasts (`CustomEvent`), dynamically re-initializing the Firebase SDK app instance when credentials are updated.
  - *Why*: Allows switching to `farmiotest` immediately without breaking applet builds or requiring external environment variable redeployments.
  - *Alternatives Considered*: Overwriting `firebase-applet-config.json` directly (risk: breaks AI Studio managed compilation if API keys are missing or invalid).

- **Decision 2: Scoped Database Security Rules vs Global Open Rules**
  - *Chosen Approach*: Define explicit node rules for `/security_system` and `/solar_iot` with `.indexOn` keys (`updated_at`, `timestamp`, `system_state`) and `.read: true, .write: true` scoped strictly to those sub-paths, leaving root locked (`$other: { .read: false, .write: false }`).
  - *Why*: Fixes the red warning shown in your mobile screenshot while ensuring ESP32 and Colab never encounter `HTTP 401 Unauthorized` errors.
  - *Alternatives Considered*: Leaving root `".read": true, ".write": true` (leaves red vulnerability warning in Firebase console).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Firebase Console                           │
│                     Project: farmiotest (GCP)                          │
├───────────────────────────────────┬────────────────────────────────────┤
│     Cloud Firestore Database      │     Realtime Database (RTDB)       │
│      (Persistent Archives)        │   (asia-southeast1, Sub-second)    │
│  - /solar_iot/security_system     │  - /security_system                │
│  - /solar_iot/telemetry_history   │    ├── buzzer, servo_angle         │
│  - /solar_iot/alerts              │    ├── boxed_frame / raw_frame     │
│                                   │    └── system_state (SLEEP/AWAKE)  │
└─────────────────▲─────────────────┴──────────────────▲─────────────────┘
                  │                                    │
         WebSocket / REST                     WebSocket / SSE
                  │                                    │
┌─────────────────┴────────────────────────────────────┴─────────────────┐
│               Farm.IOT React Dashboard (Single-Page App)                │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Firebase Config Manager: Active Project = "farmiotest"             │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│  ├── Security Surveillance: Dual-Mode Live Stream (MJPEG + Base64)   │
│  ├── SG90 Servo Gauge (15°-165°) & Animal Buzzer Override (GPIO 12)  │
│  ├── Google Drive Archive Badge & Quick Link Button                  │
│  └── Live Solar Microgrid & Power Generation Panels                  │
└─────────────────▲────────────────────────────────────▲─────────────────┘
                  │                                    │
           HTTP POST / Drive                     HTTP PATCH
                  │                                    │
┌─────────────────┴─────────────┐        ┌─────────────┴─────────────────┐
│   Google Colab CPU Vision     │        │  ESP32-CAM & NodeMCU Hardware │
│  - YOLOv8n CPU (~120ms)       │        │  - PIR Deep Sleep (GPIO 13)   │
│  - Drive Snapshot Backup      │        │  - SG90 Servo PWM (GPIO 14)   │
│  - Auto-Sleep Command Patch   │        │  - Local MJPEG Server (Port 81)│
└───────────────────────────────┘        └───────────────────────────────┘
```

#### Verification & Delivery Checklist
- [ ] Implement `src/lib/firebaseConfigManager.ts` to seamlessly handle personal Firebase configurations with hot-swapping and fallback.
- [ ] Connect all telemetry hooks (`useSolarData`, `useSecuritySystem`) to active Firebase services (RTDB + Firestore).
- [ ] Update `StationSettingsModal.tsx` and header with a dedicated "Personal Firebase Account" configuration wizard and connection tester.
- [ ] Embed the exact no-expiration, warning-free Realtime Database and Cloud Firestore security rules with 1-click clipboard copiers.
- [ ] Verify full compilation (`tsc --noEmit` and `compile_applet`) with zero errors.
