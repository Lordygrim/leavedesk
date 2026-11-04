# LeaveDesk

One Next.js app with two role-based areas: the **employee app** (`/home`, `/request`, `/my-leave`, `/alerts`) and the **HR dashboard** (`/admin/...`). Employees can only open the app. HR admins can open both.

Stack: Next.js 15 (App Router) + TypeScript, Prisma + SQLite (zero setup), cookie sessions (jose + bcryptjs), Tailwind CSS v4 with a light theme and a dark Nordic theme (colors are CSS variables mapped to Tailwind tokens in `app/globals.css`).

## Run it in VS Code

1. Install Node.js 20 or newer (https://nodejs.org), then open this folder in VS Code (File > Open Folder).
2. Open the terminal (Terminal > New Terminal) and run:

```
npm install
npx prisma db push --force-reset
npx prisma db seed
npm run dev
```

3. Open http://localhost:3000

## Updating from a newer zip

1. Stop the server (Ctrl+C in the VS Code terminal).
2. Extract the new zip into a temporary folder, then copy everything inside its `leavedesk` folder over your project folder and choose Replace. Your database (`prisma/dev.db`) is not in the zip, so your data stays.
3. In the VS Code terminal run `rm -rf .next`, then `npm install`, then `npm run dev`.
4. Only if the release notes say the database changed: `npx prisma db push --force-reset` then `npx prisma db seed` (this wipes and re-creates the sample data).

## Demo accounts (password for all: `Password123!`)

- Admins: michaelsila@company.co.ke (Managing Partner) and susan.wambui@company.co.ke (HR Manager)
- Employee: michaelmuoki@company.co.ke (Associate). Other staff: daniel.mutua, faith.chebet, kevin.kamau, joy.achieng, peter.mwangi, brian.otieno @company.co.ke

## Roles (law firm)

- The `Role` table holds the firm's job titles: Managing Partner, HR Manager, Partner, Senior Associate, Associate, Pupil, Paralegal, Legal Secretary, Law Clerk, Receptionist, Accountant, Office Administrator. Edit it to match each client.
- `isAdmin` on a role decides who can open the HR dashboard. By default that is the **Managing Partner (the owner)** and the **HR Manager**. Everyone else can only open the employee app.
- `selfApprove` is true for the Managing Partner, so the owner's own leave is approved automatically. Everyone else, including other admins, needs another admin to approve their leave.
- `middleware.ts` does a fast redirect. `lib/dal.ts` (`requireUser`, `requireAdmin`) is the real check, and it reads the role from the database on every request, so removing admin access takes effect immediately.
- To give a role admin access, set `isAdmin` to true on it in Prisma Studio (`npx prisma studio`).

## Notes

- Dates are plain `YYYY-MM-DD` strings; "today" uses the Africa/Nairobi time zone.
- Working days skip weekends and the `Holiday` table. The seed has 2026 fixed-date Kenyan holidays only. Add moveable holidays (such as Eid) and check the official gazette.
- Approved leave stays flagged "Overdue" on the dashboard until HR records the actual return.
- On Next.js 16, rename `middleware.ts` to `proxy.ts` and export `proxy` instead of `middleware`.
- Moving to Postgres: change `provider` to `postgresql` in `prisma/schema.prisma`, set `DATABASE_URL`, run `npx prisma db push`.
- Before deploying, set a new long random `AUTH_SECRET`.

## Features added in this version

- **Employee:** Calendar (month view with your leave, team leave and public holidays), Profile (details and change password), cancel a pending request, unread count and "mark all as read" on Alerts.
- **HR dashboard:** Team calendar (4-week timeline of who is out, pending and overdue), Policies (edit days a year per leave type, add leave types, add and remove public holidays), Employees (add people, change role and department, deactivate, set a temporary password).
- **Email:** every in-app notification is also emailed when `RESEND_API_KEY` (and optionally `MAIL_FROM`) is set in `.env`. Without a key, emails are only printed in the terminal. Create a free key at resend.com and verify your sending domain.
- **Scheduled reminders:** `GET /api/cron/reminders` reminds people the day before they are due back and alerts admins about overdue returns, once each. It needs `CRON_SECRET`. `vercel.json` runs it daily at 08:00 Nairobi time on Vercel. To test locally: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/reminders`.

## Not built yet

Forgot-password by email, approval by a supervising partner (reporting lines), editing admin access from the UI, attachments (such as sick notes).
