# Hyperframes Composition Brief: DoSJE Monitoring

## Objective

Create a polished, factual 20-second launch-style brag video for the DoSJE
field-inspection app and department monitoring dashboard. Connect a GPS-checked
field report to the dashboard overview without claiming production deployment
or capabilities that are not verified.

## Output

- Composition directory: `brag-output-2026-09-30-154229/composition/`
- Rendered video: `brag-output-2026-09-30-154229/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source material

- Project root: `dosje-monitoring-starter/dosje-monitoring/`
- Primary files read:
  - `README.md`
  - `apps/dashboard/index.html`
  - `apps/dashboard/src/App.tsx`
  - `apps/mobile/lib/screens/inspection_capture_screen.dart`
  - `apps/mobile/lib/screens/checklist_screen.dart`
  - `apps/api/src/inspections/inspections.service.ts`
  - `infra/demo-data.sql`
- Product name: DoSJE Monitoring
- Strongest claim: GPS-checked field reporting and status/inspection visibility
  meet in one department view.
- Key UI: mobile inspection location/evidence/checklist; dashboard metric
  cards, relative institute-location plot, and recent inspection feed.
- Copy to show:
  - `GPS checked.`
  - `Evidence captured.`
  - `Six demo institutes.`
  - `One clear view.`
  - `DoSJE Monitoring`
  - `Field work, in focus.`

## Creative direction

- Tone preset: polished
- Creative direction: quiet premium civic-tech product film; clear, credible,
  human-scale.
- Interpretation: confident readable typography, careful holds, smooth
  crossfades, realistic interface transitions, and no hype effects.
- Angle: a field visit becomes location-verified evidence and then a legible
  department dashboard record.
- Hook: one map pin resolving over a real-looking but explicitly demo-only
  location surface.
- Outro: DoSJE Monitoring / Field work, in focus.
- Avoid:
  - Generic SaaS language or unsupported performance claims.
  - Real personal data, phone numbers, OTPs, credentials, or internal URLs.
  - Presenting synthetic sample records as real operations.
  - Implying live CCTV streams, real deployment, or AI classification of
    seeded reports.
  - Fake satellite imagery or a false claim that the relative-coordinate
    dashboard plot is a full GIS map.

## Visual identity

- Background: dashboard `#f4f7fb`; cards `#ffffff`; mobile app uses a pale
  indigo Material 3 surface.
- Primary text: `#0f172a` / dashboard text near `#111827`.
- Accent: primary blue `#1d4ed8`; mobile uses an indigo seed color.
- Status accents from dashboard: green `#198754`, flagged red `#dc3545`,
  suspended amber `#ffb703`.
- Font: dashboard declares `Inter, sans-serif`; use Inter when locally
  available, otherwise a clean sans-serif fallback.
- Project visual references: login shield mark, dashboard metric cards,
  pale blue-to-green map plot, compact status chips, and mobile checklist
  controls.

## Storyboard

Use `brag-plan.md` as the creative contract.

1. **Field pin** — 3s — One DEMO pin resolves on a quiet coordinate field;
   hook copy: “A field inspection starts somewhere.”
2. **Verify and document** — 4s — Phone UI shows institute selection, GPS
   verified, evidence captured, checklist; no sensitive data.
3. **One overview** — 6s — Dashboard cards and six DEMO institute markers;
   copy: “Six demo institutes. One clear view.”
4. **Follow-up** — 4s — Flagged/pending review and inspection cards demonstrate
   actual dashboard information structure.
5. **End card** — 3s — Shield/pin lockup and “Field work, in focus.”

## Audio

- Audio role: warm upbeat business bed plus a small number of soft UI accents.
- Audio arc: short fade-in, quietly supports interface reveals, resolves with
  the closing brand.
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: low-to-moderate underlay; fade in/out, with no voice or
  ducking track.
- Music cue guidance: bundled cue preset at
  `../.agents/skills/brag/assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.md`.
  Use the 17.02s or 18.52s strong-cue area as optional inspiration for the
  end-card landing, but favor copy readability and land the end card before
  20s. Beat grid: approximately 0.5s near the end; avoid one readable line per
  beat.
- Audio-reactive treatment: subtle background/card warmth or pin glow reacting
  to the music bed, no waveform or equalizer visuals.
- Audio-coupled moments: field pin resolve; dashboard panel settle; brand mark.
- SFX selection guidance: use low/medium high-frequency-risk accents only, at
  low volume. Read the bundled `sfx-analysis.md`. Hyperframes should select
  exact assets/timing after motion is built.
- Copy planned music into `composition/assets/music/`. Keep selected SFX local
  in the composition.

## Hyperframes instructions

Use the current Hyperframes composition contract, animation, creative,
keyframe, and CLI guidance. This is `/brag`'s storyboard; do not enter the
generic Hyperframes intent interview. Recreate the UI faithfully using
sanitized synthetic content. Run `npx hyperframes check` before rendering.

