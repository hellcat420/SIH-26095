# DoSJE Smart Real-Time Monitoring & Inspection App

Starter scaffold. Full spec, tech stack, data models, and Copilot prompts
for every module: **[`docs/DoSJE-Monitoring-App-Spec.md`](docs/DoSJE-Monitoring-App-Spec.md)**

## Structure

```
apps/
  mobile/       Flutter app — Inspector/Official/NGO/Beneficiary
  dashboard/    React web dashboard for officials/authorities
  api/          NestJS backend (all core services)
services/
  ai-service/   FastAPI — face-match attendance + anomaly scoring
infra/
  docker-compose.yml   local dev environment
  k8s/                 production manifests (add later)
docs/
  DoSJE-Monitoring-App-Spec.md   full build spec
```

## Local Dev Setup

### Full local stack (Docker)

From the repository root:

```bash
cd infra
docker compose up --build
```

This starts Postgres, Redis, a local S3-compatible object-storage service,
LiveKit, MediaMTX, the API, AI service, and dashboard. Compose uses LocalStack
for local S3 development because the previous MinIO Docker Hub image is no
longer published. The API uses S3 for inspection evidence and MediaMTX for
RTSP camera sources/HLS playback. The first face-match request downloads the
InsightFace model into the persistent `ai-models` volume and therefore needs
network access.

Open the dashboard at `http://localhost:5173`, the API at
`http://localhost:3000`, and the LocalStack S3 endpoint at
`http://localhost:4566`. LocalStack and LiveKit settings in Compose are
development-only.

The local Compose stack enables development-only demo accounts by default.
For the full dashboard, use the Official account phone `9988776655`; the mobile
inspector demo uses `9876543210`. Request an OTP and enter the temporary code
returned by the API. Demo users are seeded only when `AUTH_DEMO_USERS_ENABLED=true` and
`NODE_ENV` is not `production`; the API rejects enabling them in production.
To populate the dashboard and inspector app with clearly labeled sample
institutes, assignments, and inspection reports, start the local stack and run
this from the repository root in PowerShell:

```powershell
.\infra\seed-demo-data.ps1
```

The seed is safe to rerun: it inserts or refreshes only its fixed `DEMO -`
sample records and leaves other database records untouched. The sample includes
active, flagged, and suspended institutes; completed, open, and missed
assignments; and inspection checklist/GPS examples. It does not create camera
streams, media evidence, or real-world service records. Reload the dashboard
after seeding; sign in to the mobile app with `9876543210` and refresh or
restart it to see the same inspector assignments and institute list.
For registered non-demo users, configure `OTP_GATEWAY_URL` (and optionally
`OTP_GATEWAY_TOKEN`) in an ignored `infra/.env` file. The API POSTs
`{ "phone": "...", "message": "..." }` to that gateway and does not expose the
OTP. OTP challenges are salted, hashed, expire after five minutes, and can be
used only once.

Set `FCM_PROJECT_ID` and `FCM_SERVICE_ACCOUNT_JSON` in `infra/.env` to enable
real Firebase push delivery. Without them, push requests return an explicit
service-unavailable error instead of reporting a mock success. Configure
production `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`,
`S3_BUCKET`, `REDIS_HOST`, `REDIS_PASSWORD`, HTTPS `OTP_GATEWAY_URL`,
`CORS_ORIGINS`, and comma-separated `RTSP_ALLOWED_HOSTS`, along with
LiveKit/S3/MediaMTX endpoints and credentials, before exposing the stack
outside a local development network. `JWT_SECRET` must be at least 32
characters. The API runs the checked-in TypeORM migrations at startup in
production; the initial migration creates the current schema and protects
assignment audit rows from update/delete operations.

### Run web/API processes outside Docker

Keep Postgres, Redis, MinIO, LiveKit, MediaMTX, and the AI service available
before starting the API. The API defaults to local Postgres on port `5432`;
set the corresponding database, storage, media-server, and AI environment
variables to match your services.

```bash
cd apps/api
npm ci
npm run start:dev

# In another terminal, from the repository root:
cd apps/dashboard
npm ci
npm run dev
```

The dashboard defaults to `http://127.0.0.1:3000` for the API. Set
`VITE_API_URL` before building if the API is hosted elsewhere.

### Mobile app

Install Flutter and Android Studio/SDK on the host, then launch the Android
emulator. Native Android emulators reach Docker-published API/LiveKit ports
through `10.0.2.2`; physical devices use the host machine's LAN address.
Generate the Android platform wrapper once (the generated `android/` project
is checked in with the app):

```bash
cd apps/mobile
flutter create --platforms=android --org in.gov.dosje --project-name dosje_mobile .
flutter pub get
flutter run -d emulator-5554 --dart-define=DOSJE_API_URL=http://10.0.2.2:3000
```

For a local Android emulator, build and install a debug APK from the optional
Compose mobile profile. The debug build permits the local HTTP API endpoint;
the APK is written under `apps/mobile/build/app/outputs/flutter-apk/` on the
host:

```bash
cd infra
docker compose --profile mobile run --rm mobile-build
```

The Android emulator/device itself runs on the host (Docker Desktop on
Windows cannot run the host's Android emulator as a Compose service). Install
the debug APK on the running emulator with `adb install -r
apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`. For a physical
device, override `DOSJE_API_URL` with the host's LAN API address when running
the Compose mobile builder. Configure Firebase native files and build with
`--dart-define=DOSJE_FIREBASE_CONFIGURED=true` only when push credentials and
native Firebase configuration are available.

The local dashboard demo login uses phone `9988776655`; the mobile inspector
demo uses `9876543210`. Request a fresh OTP on the login page for each sign-in.
Demo accounts are not suitable for production.

## Build Order (feed to Copilot one module at a time)

Each module folder below has its own `README.md` with the exact Copilot
prompt to use — open that folder in your editor before pasting the prompt
so Copilot has the right file context.

| # | Module | Folder |
|---|---|---|
| 1 | Auth & RBAC | `apps/api/src/auth`, `apps/mobile/lib/screens` |
| 2 | Institute & Camera Registration | `apps/api/src/institutes`, `apps/api/src/cameras` |
| 3 | Mobile Inspection Module | `apps/mobile/lib/screens`, `apps/api/src/inspections` |
| 4 | Random Assignment Engine | `apps/api/src/assignments` |
| 5 | Real-Time Dashboard | `apps/dashboard` |
| 6 | CCTV Integration | `infra` (media server), `apps/api/src/cameras` |
| 7 | Random VC Module | `apps/api/src/notifications`, `apps/mobile/lib/screens` |
| 8 | AI Services | `services/ai-service` |

Before Module 1: read `docs/DoSJE-Monitoring-App-Spec.md` sections 2
(Tech Stack) and 4 (Data Models) — keep that file open across every
Copilot session so entity names and types stay consistent.
