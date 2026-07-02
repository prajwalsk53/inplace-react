# InPlace

**A full-stack placement management system with 5 portals** — student placements, tutor site visits, employer confirmation, programme oversight, and admin approvals, all in one app.

## What it does

InPlace manages the full lifecycle of a university work placement, from application to completion, across five roles:

- **Students** track their placement status, view provider/supervisor details, submit change requests, write reflections, upload reports/documents, and message their tutor.
- **Tutors** create and manage placements on behalf of students, schedule and record site visits (with .ics calendar export), review change requests and student submissions, manage the provider directory, post announcements, and view all their placements on a map.
- **Providers (employers)** confirm or reject proposed placements (including via a passwordless emailed magic link), raise workplace issues, evaluate students, respond to tutor meeting requests, and flag placements for termination.
- **Programme directors** get programme-wide dashboards, at-risk placement monitoring, employer feedback summaries, a placements map, and analytics charts.
- **Admins** approve/reject registrations, manage all users and placements, configure system settings (reCAPTCHA), review the audit log, and export placement data to CSV.

## Tech Stack

**Frontend** — React 19 · Vite · React Router v6 · Chart.js · Leaflet (placement maps) · Socket.IO Client

**Backend** — Node.js · Express · Prisma ORM · PostgreSQL (23 models) · JWT auth · Socket.IO · Nodemailer · Multer

**Integrations** — Google reCAPTCHA v2 (login/registration, optional) · Nodemailer (OTP, password reset, provider magic-links, notifications)

**Deployment** — Frontend on Vercel, backend on Render, database on Neon (serverless Postgres) — see [Deployment](#deployment) below.

## Architecture

```
                        REACT SPA (Vercel)
        Student · Tutor · Provider · Director · Admin portals
        Axios (REST)              Socket.IO (WebSocket)
                  │                       │
                        EXPRESS API (Render)
        JWT auth → role middleware → controllers → Prisma
        Modules: placements, visits, requests, messaging,
                 announcements, provider magic-links, audit log
                  │                       │
              PostgreSQL (Neon)      SMTP (Nodemailer)
              23 Prisma models       reCAPTCHA siteverify
```

## Getting Started

### 1. Database

```bash
cd backend
cp .env.example .env
# set DATABASE_URL to your PostgreSQL connection string
npx prisma migrate dev
npm run db:seed   # optional demo data
```

### 2. Backend

```bash
cd backend
npm install
npm run dev          # http://localhost:5002
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:5175
```

Or from the repo root, `start.bat` launches both at once (Windows).

### Demo accounts (password: `password`)

| Role | Email |
| --- | --- |
| Student | student@inplace.com |
| Tutor | tutor@inplace.com |
| Provider | provider@inplace.com |
| Director | director@inplace.com |
| Admin | admin@inplace.com |

There's also a `pending.student@inplace.com` account seeded with `PENDING` approval status, useful for testing the admin approval flow.

## Portals

### Student Portal (6 pages)

Dashboard · My Placement (details, supervisor, documents) · Submit Request (change requests to tutor) · Reflections & Reports · Visits · Announcements.

### Tutor Portal (13 pages)

Dashboard (with at-risk count) · Placements (create/edit/terminate) · Visits (schedule, notes, .ics export) · Provider directory · Provider Meetings · Change Requests · Reflections & Reports review · Announcements · Map View · Settings.

### Provider Portal (9 pages)

Dashboard · Confirm Placements · Students · Visits · Meeting Requests · Issues · Evaluate · Terminate (flag for tutor review) · Settings.

### Director Portal (6 pages)

Dashboard · Placements · At Risk · Employer Feedback · Map · Reports (Chart.js analytics).

### Admin Portal (6 pages)

Users · Approve Registrations · Placements · Settings (reCAPTCHA keys) · Audit Logs · Export (CSV).

## Project Structure

```
inplace/
├── backend/
│   ├── src/
│   │   ├── config/        # Prisma client
│   │   ├── controllers/   # Business logic per portal
│   │   ├── middleware/    # JWT auth, role guards, reCAPTCHA
│   │   ├── routes/        # API routes per portal
│   │   └── utils/         # Mailer, OTP, storage, provider tokens, ICS, audit log
│   ├── prisma/            # Schema (23 models) + migrations + seed
│   └── uploads/           # Local file storage (documents/reports)
└── frontend/
    ├── src/
    │   ├── api/           # Axios client + Socket.IO
    │   ├── components/    # Sidebar, Layout
    │   ├── context/       # Auth context
    │   └── pages/         # Pages across 5 portals + shared auth/messages pages
```

## Auth notes

- Registration (student/tutor/provider) sets `approvalStatus = PENDING`; an admin must approve before login is allowed.
- Google reCAPTCHA v2 verification on login/register is **skipped automatically** until site/secret keys are configured (via Admin → Settings, stored in the `SystemSetting` table). Safe to leave blank for local development.
- Provider placement confirmation supports a passwordless emailed magic link (`/provider-confirm/:token`) in addition to normal in-app login — useful when the employer contact doesn't have an account yet.
- Email sending (OTP, password reset, provider magic-links, notifications) silently no-ops with a console log if `SMTP_HOST` isn't set — the app is fully usable locally without SMTP configured.

## Deployment

Same pattern as this project's sibling app (HealthSphere): frontend on **Vercel**, backend on **Render**, database on **Neon** (serverless Postgres), both auto-deploying on push to your main branch.

1. **Neon**: create a Postgres project, copy the connection string into `DATABASE_URL`.
2. **Render**: new Web Service pointed at `backend/`, build command `npm install && npx prisma generate`, start command `npm start` (runs `prisma migrate deploy` then boots the server). Set the env vars from `backend/.env.example`, plus `CLIENT_URL` pointing at your Vercel URL.
3. **Vercel**: new project pointed at `frontend/`, framework preset Vite. Set `VITE_API_URL` to your Render backend URL + `/api`. `frontend/vercel.json` already has the SPA rewrite rule.

This repo isn't connected to GitHub/Vercel/Render yet — those steps need your accounts and are not something that can be done without you granting access.

## Background

This is a rebuild of a PHP/MySQL placement management system (`PHP/inplace`) onto the React + Node + Prisma stack, following the same architecture and conventions as this author's prior PHP-to-React migration.
