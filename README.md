# LeaveDesk

A leave management app for organizations (law firms, schools, companies). Every organization signs up on its own, has its own people, roles, leave rules and holidays, and cannot see anyone else's data.

Stack: Next.js 15 (App Router) + TypeScript, Tailwind CSS v4, PostgreSQL (in Docker) + Prisma, cookie sessions (jose + bcryptjs).

## Run it in VS Code (PostgreSQL in Docker)

1. Install Node.js 20 or newer and Docker (Docker Engine with the Compose plugin; on Ubuntu follow https://docs.docker.com/engine/install/ubuntu/ and add yourself to the `docker` group). Check with `docker compose version`.
2. Open this folder in VS Code. Copy `.env.example` to `.env` and set `AUTH_SECRET` and `CRON_SECRET` to long random strings (the first run can use the values as they are).
3. In the terminal:

```
docker compose up -d db
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

4. Open http://localhost:3000

`docker compose up -d db` starts PostgreSQL in the background (its data lives in a Docker volume and survives restarts). `migrate dev --name init` creates the tables the first time and writes `prisma/migrations/`: keep that folder and commit it to Git. After you change `prisma/schema.prisma`, run `npx prisma migrate dev --name what_you_changed`. `npx prisma db seed` wipes the data and loads the demo firm. Stop the database with `docker compose stop db`. See the data with `npm run db:studio`.

### Moving data from the old SQLite version

If you already have people and leave requests in `prisma/dev.db` you want to keep: run the three steps above up to `migrate dev`, but skip the seed, then run `npm run db:import-sqlite`. It copies everything from the SQLite file into PostgreSQL and prints the number of rows per table. It only reads the SQLite file, so it stays as a backup.

### Running everything in containers

`docker compose --profile app up --build` builds the app image from the `Dockerfile` and starts the app and PostgreSQL together at http://localhost:3000. It applies migrations on start (`prisma migrate deploy`), so create `prisma/migrations` with `migrate dev` first. It reads `AUTH_SECRET`, `CRON_SECRET`, `APP_URL`, Google and email settings from your `.env`.

### Hosted PostgreSQL

To use a hosted database (Neon, Supabase, AWS RDS...), set `DATABASE_URL` to its connection string (often ending in `?sslmode=require`) and run `npx prisma migrate deploy`. Hosted PostgreSQL also works on Vercel, which SQLite does not.

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

**Annual leave allowance.** Each organization picks how annual leave is given (Policies, and at sign-up): **yearly** (one fixed allowance, e.g. 21 days, available from 1 January), **half-yearly**, **quarterly** or **monthly**. For the non-yearly options it also picks the rule: **only in its own period** (days must be taken in the period they are given, unused days are lost: e.g. 0, 5, 5, 0 by quarter), or **building up** (accrual: days are earned as each period starts and can be taken any time later in the year: e.g. 2 days a month). A request that would go over the allowance is refused. Annual leave per year is the total of all periods. Older organizations that only had four quarter fields keep working.

**Mandatory leave.** Periods that repeat every year (this firm: 22 Dec to 11 Jan) are treated like public holidays: they are skipped when working days and back-at-work dates are calculated, and shown on the calendars.

**Other settings (Policies).** Rename the organization, add leave types and set their days, add or remove public holidays, add or remove roles.

## Signing up

1. **Create an account** on `/sign-up`: use **Sign up with Google**, or an email and a password (typed twice). Email sign-ups get a confirmation link by email; Google sign-ups are confirmed straight away. Without `RESEND_API_KEY` the link is also shown on the page and printed in the terminal (development only).
2. **Create or join an organization** (two options side by side):
   - **Create an organization:** organization name, your name and job title, and the annual leave allowance. You become the owner and an admin and land on the dashboard.
   - **Join an organization:** type the organization's name (capitals don't matter), then give your name, role and department. The role list never includes admin roles, so nobody can join as an admin. By default an admin must approve the request first: the person cannot sign in until then, admins are notified, and the request appears under **Employees > Waiting to join**. Admins can turn the approval requirement off under **Policies**.

Organization names are unique (ignoring capitals), because people join by typing the name.

## Google sign-in (optional)

People can sign up and sign in with Google. The Google buttons are always shown. Until these settings are added, clicking one explains that Google is not set up yet.

1. Go to https://console.cloud.google.com, create a project, and set up the OAuth consent screen (Google Auth Platform).
2. Create an OAuth client ID of type **Web application**.
3. Under authorized redirect URIs add `http://localhost:3000/api/auth/google/callback` (and your real address when you deploy, for example `https://yourapp.com/api/auth/google/callback`). Google does not accept a plain IP address, so open the app at `http://localhost:3000` when testing.
4. Add these lines to `.env`, then restart `npm run dev`:

```
GOOGLE_CLIENT_ID="...your client id..."
GOOGLE_CLIENT_SECRET="...your client secret..."
APP_URL="http://localhost:3000"
```

How it works: **Sign up with Google** confirms the Google email and goes on to create the organization. **Continue with Google** on the sign-in page signs in anyone whose Google account matches their LeaveDesk account (by the linked Google account, or by the same email the first time). Employees added by an admin can use Google if the admin adds their Google email. A signed-in person can connect a Google account from Profile, even if its email differs from their work email.

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
- On a real server, change the database password in `docker-compose.yml`, do not publish port 5432 to the internet, and back up the `pgdata` volume (for example with `pg_dump`).
- On Next.js 16, rename `middleware.ts` to `proxy.ts` and export `proxy`.
- Set a new long random `AUTH_SECRET` and `CRON_SECRET` before deploying.

## Not built yet

Attachments such as sick notes, signing in to a specific organization when the same email is used in several, an owner-transfer option, approval chains with more than one step.
