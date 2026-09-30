# DoSJE Monitoring — Brag Plan

## Planning rubric

1. **What is the app?** A field-inspection platform that connects GPS-checked mobile reporting with a department monitoring dashboard.
2. **Strongest claim:** A field report can be anchored to a real place and surfaced in the same view as institute status and inspection activity.
3. **Visual hook:** The dashboard’s clean light canvas, indigo-blue actions, location plot, and green/amber/red institute statuses.
4. **UI to show:** The actual workflow distilled into a recreated mobile inspection screen, followed by the API-fed dashboard’s metric cards, relative institute map, and inspection feed.
5. **Shortest satisfying video:** 20 seconds: enough to move from field capture to department overview without a hurried montage.
6. **Tone:** `polished`; quiet civic-tech product film, confident and factual rather than overclaiming. Smooth crossfades and considered interface motion.
7. **Audio:** Warm, upbeat business bed from the bundled Ende track, with a few soft UI accents and one restrained logo landing. Avoid voiceover and avoid alarm-style effects.
8. **Share caption:** “A field inspection, from GPS-checked evidence to a department-wide view. DoSJE Monitoring connects on-the-ground reporting with the oversight dashboard.”
9. **User flow:** Inspector selects a demo institute → validates location and captures evidence → submits checklist/report → official sees institute status and inspections together on the dashboard.

## Public-content guardrails

- Show synthetic sample institutions only, labeled `DEMO`.
- Do not show phone numbers, OTPs, access tokens, personal names, email addresses, or actual camera URLs.
- Do not imply that the demo is a production department deployment, that physical cameras are streaming, or that AI evaluated the sample reports.
- Use only the verified demo scope: six demo institutes, five demo inspection records, mixed institute statuses, and an operational local dashboard/mobile path.

## Creative angle

Make the connection between a single field visit and a useful overview feel tangible: a map pin becomes a verified location, an evidence card becomes a report, and that report settles into a calm monitoring dashboard. The polish comes from clarity, not from making unverified promises.

## Storyboard — 20 seconds, 16:9 landscape

| Time | Scene | Picture / motion | On-screen copy | Transition / audio |
|---|---|---|---|---|
| 0.00–3.00 | The field becomes a point on the map | Deep navy title card opens onto a restrained coordinate grid. A single indigo pin resolves into a labeled `DEMO` institute marker. | `A field inspection starts somewhere.` | Soft music fade-in; pin resolves near the opening beat. |
| 3.00–7.00 | Verify, then document | A faithful mobile-app frame: choose a DEMO institute, a GPS-verified state, a camera evidence tile, and a checklist confirmation. No device identity or real-person data. | `GPS checked.` then `Evidence captured.` | Small click/soft impact on verified state; hold each line long enough to read. |
| 7.00–13.00 | One department view | Transition from the phone into the recreated project dashboard: metric cards, relative map plot with green/amber/red markers, and synthetic inspection feed. | `Six demo institutes.` / `One clear view.` | Dashboard panels move in with quiet, staggered motion; optionally align one major reveal to a strong music cue. |
| 13.00–17.00 | Exceptions stay visible | Focus the dashboard’s flagged and pending-review samples, then show a concise report card with checklist/GPS glyphs. | `Status. Follow-up. Field reports.` | Restrained card transitions, no flashing or simulated live-camera footage. |
| 17.00–20.00 | Close | Indigo location pin becomes the DoSJE shield mark and wordmark over the light dashboard canvas. | `DoSJE Monitoring` / `Field work, in focus.` | Strong-cue logo landing; music resolves with a short fade. |

**Total duration:** 20 seconds. Scene boundaries may shift slightly to preserve
readability and natural movement while keeping the total between 15 and 25
seconds.

## Creative QA notes

- Keep each full sentence visible for at least 1.5 seconds.
- Do not animate text so rapidly that it becomes unreadable.
- Draw from the actual dashboard labels and mobile inspection actions, but
  recreate the interface with sanitized demo-only content.
- Treat the map as the project's relative coordinate plot; do not style it as
  a real GIS basemap.
- Any statistics in the video must be marked as demo counts and match the
  seeded dataset at render time.
