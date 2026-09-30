# Mobile Screens — Build Order

1. **login_screen.dart** — Module 1 (Auth). Copilot prompt:
   "Create a Flutter login screen with phone number + OTP input, calling
   a REST API for OTP request/verify, storing the returned JWT in
   flutter_secure_storage."

2. **inspection_capture_screen.dart** — Module 3 (core MVP screen). Copilot prompt:
   "Create a Flutter screen that captures a geotagged photo, overlays GPS
   coordinates and timestamp on the image, validates the device is within
   100 meters of a given lat/lng, and queues the upload for background
   sync using Workmanager."

3. **checklist_screen.dart** — Module 3. Copilot prompt:
   "Create a Flutter form renderer that builds a checklist UI dynamically
   from a JSON schema (question text, type: text/boolean/photo/number),
   and submits responses alongside the captured media."

4. **vc_call_screen.dart** — Module 7. Copilot prompt:
   "Create a Flutter screen that joins a LiveKit video room using a token
   received via FCM push notification payload."
