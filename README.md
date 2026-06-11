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
# 🏥 ClinicQ - Intelligent Queue Management

> A stunning, real-time digital queue management system designed for neighborhood clinics. Features a synchronized Admin Dashboard and a Live Waiting Room display with a premium 3D Glassmorphism aesthetic.

---

## 🚀 Features

- **⚡ Real-Time Synchronization:** Supabase WebSockets ensure that when the doctor calls "Next", the waiting room screen updates instantly without refreshing.
- **🎨 Stunning 3D Dark UI:** A highly polished "Glassmorphism" interface with neon glowing ambient lights, deep shadows, and physical 3D button press effects.
- **👨‍💼 Receptionist Dashboard (`/admin`):**
  - Add patients seamlessly.
  - One-click "Call Next" functionality.
  - "Demo Mode" to instantly populate the queue for presentations.
  - Edit Average Consultation Time to automatically calculate Estimated Wait Times.
- **📺 Live Waiting Screen (`/waiting`):**
  - Big, bold display of the "Now Serving" token.
  - "Next Up" indicator so the next patient is prepared.
  - Real-time display of "People Ahead" and "Estimated Wait Time" for individual patients (e.g. `?token=T007`).

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (with custom 3D glassmorphism)
- **Database & Realtime:** Supabase (PostgreSQL + WebSockets)
- **Icons:** Lucide React
- **Notifications:** React Hot Toast

---

## 💻 Local Development Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/mikeydebug/ClinicQ.git
   cd ClinicQ
   npm install
   ```

2. **Supabase Database Setup**
   - Go to [Supabase](https://supabase.com) and create a new project.
   - Go to the **SQL Editor** and run the following script:

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
       status TEXT DEFAULT 'waiting',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       called_at TIMESTAMP WITH TIME ZONE
   );

   -- Turn OFF Row Level Security (For Hackathon/Demo purposes)
   ALTER TABLE queue_sessions DISABLE ROW LEVEL SECURITY;
   ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

   -- Enable Realtime WebSockets
   ALTER PUBLICATION supabase_realtime ADD TABLE queue_sessions;
   ALTER PUBLICATION supabase_realtime ADD TABLE patients;
   ```

3. **Environment Variables**
   - Rename `.env.local.example` to `.env.local`
   - Fill in your Supabase details from *Project Settings -> API*:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the App**
   ```bash
   npm run dev
   ```
   - Main Landing Page: `http://localhost:3000/`
   - Receptionist Admin: `http://localhost:3000/admin`
   - Patient Waiting: `http://localhost:3000/waiting`

---

## 🌍 How to Deploy to Vercel

Deployment is extremely easy because Vercel is the creator of Next.js.

1. **Push your code to GitHub** (If you haven't already).
2. Go to **[Vercel.com](https://vercel.com/)** and log in with your GitHub account.
3. Click **"Add New..."** -> **"Project"**.
4. Import the `ClinicQ` repository from your GitHub list.
5. In the **"Environment Variables"** section during setup, add the two variables exactly as they are in your `.env.local` file:
   - Name: `NEXT_PUBLIC_SUPABASE_URL` | Value: `https://your-url.supabase.co`
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Value: `your-anon-key`
6. Click **Deploy**! 🚀

Vercel will build and deploy your app in about 1-2 minutes, and give you a live public URL that you can share with the judges!
