# Plan: Custom Firebase Project ID Input with Video Tutorial Slot

A refined onboarding and settings experience ensuring operators enter their own Firebase Project ID with no automatic prefilling of the developer's internal project ID (`red-access-fpthm`), paired with an embedded Video Tutorial Slot explaining how to create a Firebase project and connect it to their station hardware.

---

## User Review Required

> [!IMPORTANT]
> **Key Decisions based on your answers:**
> 1. **Blank Firebase Project ID by Default**: Neither administrators nor guest operators will have `red-access-fpthm` pre-filled. The input field will always start empty with a clear placeholder (`e.g. my-solar-station-409`), ensuring every user consciously enters their own Firebase project credentials.
> 2. **Embedded Video Tutorial Slot**: Step 4 of the onboarding modal and the "Station & Cloud" tab in Settings will include a dedicated video player slot ("How to Set Up Your Free Firebase Cloud"). It comes with a default tutorial walkthrough video and allows the station owner to paste any custom YouTube or video embed link.

---

## 1. System Overview & Requirements Analysis

### Problem Statement
Previously, when the station owner logged in via Google, the modal detected admin credentials and automatically defaulted `useDeveloperProject` to `true`, pre-filling the internal AI Studio project ID `red-access-fpthm`. When tested, it displayed:
`Project ID syntax verified: "red-access-fpthm" is ready for hardware sync.`

This caused confusion because the user wants **every station operator to supply their own independent Firebase Project ID** to guarantee complete database isolation and privacy. Furthermore, if users don't know how to create a Firebase project, they need an accessible video tutorial right in the modal.

### Solution Architecture
1. **Remove Automatic Developer Project Fallback**:
   - Strip all automatic pre-fill of `developerProjectId` / `red-access-fpthm` across `StationOnboardingModal.tsx` and `StationSettingsModal.tsx`.
   - The Firebase Project ID input starts completely blank (`""`).
   - If a user tests without entering a project ID, display a friendly prompt guiding them to enter one or watch the tutorial video.

2. **Interactive Video Tutorial Slot**:
   - Provide an expandable Video Tutorial Slot in Step 4 of `StationOnboardingModal.tsx`.
   - Display an embedded video player (supporting YouTube embeds, e.g. `https://www.youtube.com/embed/...` with responsive 16:9 aspect ratio and fallback video).
   - Allow the station owner to set or update the tutorial video URL (stored in station settings / Firestore profile or local storage fallback).
   - Include quick-reference timestamps or bulleted steps below the video (1. Create Project, 2. Enable Firestore, 3. Copy Project ID).

3. **Multi-User Telemetry Isolation**:
   - Station profiles preserve the user's custom `firebaseProjectId` and `stationDeviceId`.
   - The ESP32 / Arduino firmware generator in `Esp32CodeHelper.tsx` generates sketch code configured with the user's custom Firebase credentials, ensuring their hardware streams solely to their own project.

---

## 2. Visual Aesthetic, Layout, and Design Tokens

Following the `frontend-design` constitution and dashboard specifications:

- **Surface Treatment**: Single-elevation dark surfaces (`bg-zinc-950/90`, `border-zinc-800`), eliminating layered nested card clutter.
- **Video Slot Card**: Sleek dark cinema container with a 16:9 ratio player, custom play banner, and one-click expand/collapse to prevent taking excessive vertical modal space on smaller screens.
- **Input Fields**: High-contrast monospace inputs (`font-mono text-xs text-white bg-black border-zinc-800`) with clear helper text.
- **Badging & Typography**: Subtle unboxed text markers (`·`) for step separation without static pill enclosures. Monospace tabular numerals (`font-mono tabular-nums`) for device nodes and port IDs.

---

## 3. Component Hierarchy & Implementation Scope

```
src/
├── components/
│   ├── StationOnboardingModal.tsx   # Update Step 4: Remove red-access-fpthm prefill, add Video Tutorial Slot
│   ├── StationSettingsModal.tsx     # Update Station tab: Add Video URL editor & embedded video tutorial
│   ├── VideoTutorialSlot.tsx        # Reusable responsive tutorial video player component with YouTube support
│   └── Esp32CodeHelper.tsx          # Ensure sketch generator uses user's custom project ID or warns if blank
├── types/
│   └── solar.ts                     # Add tutorialVideoUrl optional field to StationProfile
└── App.tsx                          # Pass video tutorial settings and profile handlers
```

---

## 4. Video Slot & Firebase Onboarding Details

### `VideoTutorialSlot.tsx`
- **Props**:
  - `videoUrl?: string` (Defaults to an informative Firebase quickstart guide video embed, e.g., YouTube embed URL)
  - `onUpdateVideoUrl?: (newUrl: string) => void` (Editable for station admin)
  - `isEditable?: boolean`
- **Features**:
  - Responsive 16:9 aspect ratio iframe wrapper.
  - Video URL sanitizer (converts regular `youtube.com/watch?v=XYZ` or `youtu.be/XYZ` links into clean `youtube.com/embed/XYZ` embed URLs).
  - Collapsible toggle ("📺 Watch Quick Setup Video: How to Get Your Firebase Project ID").
  - Quick action to test or preview the video.

### `StationOnboardingModal.tsx` Updates
- **Initialization**:
  - `firebaseProjectId` initializes to `""` (empty string) regardless of user role.
  - `useDeveloperProject` defaults to `false`.
  - Step 4 displays the new `VideoTutorialSlot` prominently above the Project ID input.
  - Validation requires a non-empty, valid project ID string before hardware sync testing can proceed.

---

## 5. Verification Plan

1. **Step 4 Blank Field Verification**:
   - Log in with Google as admin (`rajeevranjanchaudhary104@gmail.com`).
   - Open onboarding / station setup.
   - Verify that the Firebase Project ID field is completely empty and `red-access-fpthm` does NOT appear anywhere.

2. **Video Tutorial Slot Verification**:
   - Verify the "Watch Video Tutorial" section expands properly and renders the responsive video player.
   - Test changing the video URL to ensure YouTube links format and play smoothly.

3. **Connection Test Verification**:
   - Test with an empty field: confirm a clear validation warning is shown.
   - Test entering a custom Firebase project ID: confirm the connectivity test verifies the custom ID.

4. **Build & Compilation Check**:
   - Run `compile_applet` to ensure zero TypeScript or Vite compilation errors.
