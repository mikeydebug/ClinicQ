# ClinicQ - Live Digital Queue Manager

ClinicQ is a real-time queue management system tailored for Indian neighbourhood clinics. It replaces physical token paper systems with a live, web-based token display screen.

Live Demo: [Your Live Link Here]

## Tech Stack
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Real-time: Supabase Realtime (WebSockets)
- Database: Supabase (PostgreSQL)

## Screenshots
[Add screenshots of /admin and /waiting here]

## Local Setup Instructions

1. Clone this repository.
2. Run `npm install`
3. Create a Supabase project and run the following Schema SQL in the SQL Editor.
4. Copy `.env.local.example` to `.env.local` and add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Run `npm run dev`
6. Open `http://localhost:3000/admin` in one tab (Receptionist View).
7. Open `http://localhost:3000/waiting` in another tab (Patient View).
8. Add patients on the `/admin` screen and watch the `/waiting` screen update instantly via WebSockets!

## Database Schema (Supabase SQL)

Copy and run this in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Queue Sessions Table
CREATE TABLE queue_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    avg_consultation_time INTEGER DEFAULT 5,
    current_token INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Create Patients Table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES queue_sessions(id),
    token_number INTEGER NOT NULL,
    token_display TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'current', 'done'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE
);

-- Insert a default active session
INSERT INTO queue_sessions (avg_consultation_time, current_token, is_active)
VALUES (5, 0, true);

-- Enable Realtime
-- Go to Supabase Dashboard -> Database -> Replication and enable realtime for both tables
-- Or run:
alter publication supabase_realtime add table queue_sessions;
alter publication supabase_realtime add table patients;
```
