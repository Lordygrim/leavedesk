# LeaveDesk

A leave management app for organizations (law firms, schools, companies). Every organization signs up on its own, has its own people, roles, leave rules and holidays, and cannot see anyone else's data.

Stack: Next.js 15 (App Router) + TypeScript, Tailwind CSS v4, Prisma + SQLite (zero setup), cookie sessions (jose + bcryptjs).

## Run it in VS Code

1. Install Node.js 20 or newer, then open this folder in VS Code (File > Open Folder).
2. In the terminal (Terminal > New Terminal):

```
npm install
npx prisma db push --force-reset
npx prisma db seed
npm run dev
```

3. Open http://localhost:3000

`--force-reset` wipes the database. Use it for a fresh start or after a version that changed the database structure.

## Demo organization: "Our Law Firm" (password for everyone: `Password123!`)

| Person | Role | Access |
|---|---|---|
| H. Gichuki (h.gichuki@company.co.ke) | Partner | Owner and admin |
| Loise Mwai (loise.mwai@company.co.ke) | Associate | Admin |
| Grace Mincha (grace.mincha@company.co.ke) | Associate | Employee |
| Caesar Kiune (caesar.kiune@company.co.ke) | Litigation Clerk | Employee |
| Brian Mulama (brian.mulama@company.co.ke) | Conveyancing Clerk | Employee |
| Esther Njoki (esther.njoki@company.co.ke) | Conveyancing & Dispatch | Employee |
| Karen Wachira (karen.wachira@company.co.ke) | Dispatch & Office Admin | Employee |
| Sylvia Maina (sylvia.maina@company.co.ke) | Receptionist | Employee |

The email addresses are placeholders. Change them under Employees. To try a second organization, click "Create your organization" on the sign-in page.

## How it works

**Organizations.** Signing up creates an organization and makes you its owner. Every record belongs to one organization, and every query is limited to the signed-in person's organization (`lib/dal.ts`).

**Admin access.** A person is an admin if they are the owner, were given admin access by the owner or another admin (Employees > Edit > Admin access), or have a role named HR or Human Resources (automatic). The owner always keeps admin access, and at least one active admin must always remain. The owner's own leave is approved automatically; everyone else's, including other admins', is approved by another admin.

**Off days (leave days per quarter).** Each organization sets how many annual leave days people may take in each quarter (Policies). This firm uses Q1: 0, Q2: 5, Q3: 5, Q4: 0. A request that would go over a quarter's allowance is refused. Annual leave per year is the total of the four quarters.

**Mandatory leave.** Periods that repeat every year (this firm: 22 Dec to 11 Jan) are treated like public holidays: they are skipped when working days and back-at-work dates are calculated, and shown on the calendars.

**Other settings (Policies).** Rename the organization, add leave types and set their days, add or remove public holidays, add or remove roles.

## Google sign-in (optional)

People can sign up and sign in with Google. Without these settings the Google buttons are simply hidden.

1. Go to https://console.cloud.google.com, create a project, and set up the OAuth consent screen (Google Auth Platform).
2. Create an OAuth client ID of type **Web application**.
3. Under authorized redirect URIs add `http://localhost:3000/api/auth/google/callback` (and your real address when you deploy, for example `https://yourapp.com/api/auth/google/callback`). Google does not accept a plain IP address, so open the app at `http://localhost:3000` when testing.
4. Add these lines to `.env`, then restart `npm run dev`:

```
GOOGLE_CLIENT_ID="...your client id..."
GOOGLE_CLIENT_SECRET="...your client secret..."
APP_URL="http://localhost:3000"
```

How it works: **Sign up with Google** on the sign-up page verifies the Google email, then asks for the organization details. **Continue with Google** on the sign-in page signs in anyone whose Google account matches their LeaveDesk account (by the linked Google account, or by the same email the first time). Employees added by an admin can use Google if the admin adds their Google email. A signed-in person can connect a Google account from Profile, even if its email differs from their work email.

## Forgot password

"Forgot your password?" on the sign-in page emails a one-time link (valid for one hour; only a hash of it is stored). Without `RESEND_API_KEY` the email is printed in the terminal where `npm run dev` runs, so you can copy the link while testing. To send real emails, set `RESEND_API_KEY` and `MAIL_FROM` in `.env` (Resend only sends to other people once you have verified your own domain), and set `APP_URL` to the address people use. People who signed up with Google can also use it to set a password.

## Who approves leave

Each person can have a supervisor ("Reports to", under Employees > Edit), for example a partner or manager. New requests notify the supervisor and the admins. Either can approve or decline, and whoever decides first settles it. Supervisors who are not admins get an **Approvals** page in the employee app (shown only to people who supervise someone). A person with no supervisor is approved by the admins. Nobody can decide their own request, and the owner's own leave is approved automatically.

## Other features

Employee: home with ring gauges, request leave (the note for HR is required), my leave with cancel, calendar, notifications, profile with password change and light/dark mode (remembered in a cookie).
HR dashboard: who's on leave with record return, requests with approve or decline, team calendar, employees (add, edit, grant or rescind admin, delete), policies, reports with audit trail and CSV export.
Email: set `RESEND_API_KEY` (and `MAIL_FROM`) in `.env` to send real emails. Without a key they are only printed in the terminal.
Reminders: `GET /api/cron/reminders` (needs `CRON_SECRET`) reminds people the day before they return and alerts admins about overdue returns. `vercel.json` schedules it daily on Vercel. Test locally: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/reminders`

## Notes

- Dates are plain `YYYY-MM-DD` strings; "today" uses Africa/Nairobi time.
- New organizations start with fixed-date 2026 and part of 2027 Kenyan public holidays. Add the rest, and moveable ones, under Policies.
- SQLite does not work on Vercel. Before deploying there, move to hosted Postgres: change `provider` in `prisma/schema.prisma`, set `DATABASE_URL`, run `npx prisma db push`.
- On Next.js 16, rename `middleware.ts` to `proxy.ts` and export `proxy`.
- Set a new long random `AUTH_SECRET` and `CRON_SECRET` before deploying.

## Not built yet

Attachments such as sick notes, signing in to a specific organization when the same email is used in several, an owner-transfer option, approval chains with more than one step.
