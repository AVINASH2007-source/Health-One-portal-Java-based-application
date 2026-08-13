# Health-One — Frontend

Lifetime Digital Health Record & Emergency Access System.
React + TypeScript + Vite + Tailwind CSS + Framer Motion.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

- `/` — storytelling marketing landing page (before sign-in)
- `/login` — role picker (Patient / Doctor / Hospital), with a Sign in / Create account toggle
- `/login/:role` — role-themed sign-in / sign-up page (Google button + email/password), e.g. `/login/doctor?mode=signup`
- `/patient`, `/doctor`, `/hospital` — role dashboards, reachable **only** after
  logging in as that role — there is no manual role switcher anymore
- `/emergency/:patientId` — standalone emergency responder access flow

## Auth & routing

`src/lib/AuthContext.tsx` holds the signed-in role (set once, at login).
`src/lib/ProtectedRoute.tsx` guards every dashboard route: signing in as
Patient always opens the Patient dashboard, and typing `/doctor` in the URL
while signed in as a patient bounces you back to `/patient`. Log out from
the top bar to return to the landing page.

## Structure

```
src/
  components/ui/     shared design-system pieces (Card, Sidebar, Topbar,
                      StatCard, VitalMini, HealthRing, AIAssistantBubble,
                      AnimatedCounter, VitalLine, AIThinking,
                      EmergencyBanner, ParallaxBlobs, Skeleton, PagePlaceholder)
  layouts/            DashboardLayout — sidebar + topbar + page transitions
  lib/navConfig.ts    single source of truth: every module, its route,
                      its icon, and who owns it (patient / doctor / hospital only)
  lib/roleTheme.ts    per-role accent color, icon, and copy
  lib/AuthContext.tsx sign-in state + role-based routing
  pages/<role>/       one file per module/tab
```

**Every module in the spec already has a route and a placeholder page**,
generated from `navConfig.ts`. To build a real module, create/replace the
page component and register it in the `overrides` map at the top of
`App.tsx` — you don't need to touch routing or navigation.

## Design system

Premium light theme — no dark mode.

- **Palette**: white `#FFFFFF` background, `#F7FAFC` secondary surface,
  Teal `#14B8A6` (core health data), Blue `#2563EB` (AI & doctor features),
  Soft Blue `#3B82F6` (hospital/secondary), Emerald `#10B981` (positive
  states), Coral `#EF4444` (emergency/critical only).
- **Type**: Space Grotesk (display/headings), Inter (body), JetBrains Mono
  (vitals, IDs, timestamps).
- **Signature motif**: `VitalLine` — the animated ECG waveform used in the
  sidebar, login hero, and landing page. Reuse it rather than inventing a
  new loading/brand element.
- **Global background video**: `src/components/ui/VideoBackground.tsx` is
  mounted once in `App.tsx`, as a sibling of `<Routes>` — not inside any
  page component — so it never unmounts or restarts as you navigate
  between the landing page, role picker, and login. It's `position: fixed`,
  fills the viewport, and sits at `z-index: -10` behind everything. Two
  `<video>` elements share the same source and crossfade into each other
  right before the loop point, which hides the native `loop` attribute's
  restart stutter, so playback reads as one continuous, uninterrupted
  loop. A thin `rgba(5,20,40,0.18)` overlay is the *only* thing dimming
  it, for text legibility. Source files live in `public/media/`
  (`hero-bg.mp4`, remuxed with `faststart` for instant playback, plus
  `hero-bg-poster.jpg` to avoid a black flash before the first frame
  decodes). The video shows through on any page that doesn't set its own
  opaque background — the dashboards stay opaque via `DashboardLayout`'s
  `bg-void`, so it's invisible (and effectively paused behind opaque
  content) once you're signed in.
- **Role theming**: `src/lib/roleTheme.ts` gives each of the 3 portals its
  own accent color, icon, and copy — used on the role-select grid and the
  login page so each portal feels distinct while sharing one component.
- Reuse `Card`, `StatCard`, `VitalMini`, `HealthRing`, `AIAssistantBubble`,
  `AIThinking`, `EmergencyBanner`, `ParallaxBlobs`, `Skeleton` instead of
  writing new primitives — keeps every module visually consistent even
  though 3 people are building in parallel.

## Module ownership (from `navConfig.ts`)

Scoped to what's realistically buildable — see "Feature scope" below for
what was cut and why.

| Member | Owns |
|---|---|
| **Member 1** | Patient dashboard: Overview, Medical Timeline, Records, Medications, Emergency Card, Health Analytics, Language |
| **Member 2** | Doctor dashboard: Patient Search, Patient Timeline, AI Summary, New Entry, Emergency Access Log — plus auth/RBAC and the emergency-access verification flow |
| **Member 3** | Hospital dashboard: Overview, Doctor Management, Departments, Audit Logs |

Owners are also tagged live on each placeholder page and visible per nav
item in `navConfig.ts` — update that file as work gets reassigned.

## Feature scope

The module list is intentionally narrower than the original spec. Cut for
being institutionally gated, not achievable from a web app, or a real
liability risk if presented as authoritative:

- **Documents & Insurance** — claims processing requires an insurer
  partnership; dropped entirely rather than ship a half-feature
- **Access & Sharing, Family History, Settings, My Patients, Upload/Sync
  Records** — outside the approved feature list, cut to keep scope tight
- **Wearable sync** — real HealthKit/Health Connect sync needs a native
  mobile app, not reachable from this React web stack
- **Biometric emergency auth** — the Emergency Access flow verifies
  responder credentials (medical license ID), not device biometrics,
  since fingerprint/face unlock confirms the device user, not a clinical
  credential
- **AI Quick Diagnosis** — removed; suggesting differentials is a bigger
  liability than summarizing records. The AI Summary and Drug Interaction
  Checker that remain both carry an explicit "AI-generated, assistive
  only" disclaimer
- **Multi-language UI** was added as a real nav item (Patient → Language),
  currently a placeholder page like every other unbuilt module. i18n
  libraries make this genuinely buildable.
- **Telemedicine** was added in an earlier pass and then removed by
  request to keep scope tight — WebRTC/Daily.co would make it buildable
  if it's added back later.

## Backend integration

Pages currently use hardcoded sample data. When wiring to the real API
(Spring Boot / PostgreSQL per the project spec), keep data-fetching in a
`src/lib/api/` folder (create it) with one file per resource, so all three
of you hit a consistent pattern instead of ad-hoc fetch calls per page.
