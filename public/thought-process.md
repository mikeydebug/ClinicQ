---
# ClinicQ — Thought Process Sheet

## Problem Understanding
Indian neighbourhood clinics often rely on paper tokens or manual shouting for queue management. This creates crowded waiting rooms, anxious patients constantly asking "kitna time lagega?" (how much time?), and inefficient receptionist workflows. A digital live display reduces anxiety and modernizes the clinic experience.

## Solution Architecture
Next.js 14 provides a fast, robust full-stack framework allowing both frontend and API routes to coexist in a single deployable Vercel project. Supabase Realtime was chosen over polling to reduce server load and provide an instantaneous "wow" factor, while being simpler to implement than custom WebSockets or Firebase.

## The 3 Core Questions Answered
1. **Under 10 seconds?** → The receptionist UI auto-focuses the name input, requires no manual token numbering, and allows submission via the 'Enter' key. The "Call Next" action is a single massive button with disabled states to prevent errors.
2. **Live without refresh?** → Supabase `postgres_changes` websocket subscriptions listen directly to the database. The moment a row updates, both screens re-fetch state, providing <500ms sync.
3. **Real wait time?** → Wait time is dynamic: `count(status='waiting' AND token < patient_token) * avg_consultation_time`. The average time can be adjusted live by the receptionist, instantly recalculating all patients' wait times via WebSockets.

## Concurrency Edge Cases (CRITICAL)

### Edge Case 1: Two receptionists click "Call Next" simultaneously
- **Problem**: Race condition — both read same current token, both try to advance.
- **Solution**: We use a targeted `UPDATE` with `WHERE status='waiting'` clause. If two receptionists try to update the exact same patient row, only one database transaction succeeds. If a request returns no updated rows, it retries to find the *next* next patient.

### Edge Case 2: Queue is empty, receptionist clicks "Call Next"
- **Problem**: No next patient exists.
- **Solution**: The API checks if `nextPatientData` exists before updating. If 0 waiting, it returns a 400 error. The UI also disables the button if `waitingCount === 0`.

### Edge Case 3: Patient joins queue after "Call Next" was clicked
- **Problem**: New patient's wait time might be wrong.
- **Solution**: Wait time recalculates on every Realtime event because the formula uses a LIVE `COUNT` from the DB, not a cached static value.

### Edge Case 4: Network disconnects on patient's phone
- **Problem**: Patient misses their token being called.
- **Solution**: Supabase Realtime auto-reconnects under the hood. On any event, we re-fetch the entire current state so no events are "missed" during a drop.

### Edge Case 5: Doctor takes longer than avg consultation time
- **Problem**: Estimated wait becomes inaccurate.
- **Solution**: Receptionist can update `avg_consultation_time` live on the dashboard. This triggers a `queue_sessions` UPDATE event, instantly recalculating wait times on all phones.

### Edge Case 6: Same patient accidentally added twice
- **Problem**: Duplicate entries waste tokens.
- **Solution**: The API checks for existing patients with the same name (and phone if provided) in the active session. It returns a soft warning, allowing the frontend to optionally confirm or alert the user.

## Why This Beats Paper Tokens
- **Visibility**: Patients know exactly when their turn is coming from their phone or a TV screen.
- **Speed**: Receptionist saves time handwriting numbers or keeping track.
- **Data**: Sets foundation for analytics (avg wait time, peak hours).

## What I'd Add With More Time
- QR code generation on the admin panel that patients can scan to open `/waiting?token=T007`.
- SMS notifications via Twilio when the patient is 2 tokens away.
- Historical analytics dashboard for the clinic owner.

## Demo Moment Explanation
"The moment a receptionist clicks Call Next and a patient 3 meters away sees their token update on their phone — without touching it — that's when a clinic owner understands the value immediately."
---
