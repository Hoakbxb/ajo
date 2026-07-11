# Friends Reward Circle

A private community platform with a simple 2× matrix reward system. Built with **Next.js 16**, **Supabase (PostgreSQL)**, and **TypeScript**.

## How It Works

The cycle repeats forever:

1. **Join** — you are merged under an active member who is building their matrix
2. **Pay ₦5,000** — send payment to your assigned upline and wait for confirmation
3. **Active** — once confirmed, you are active and your matrix starts at **0/2**
4. **Build** — two members are placed under you; each pays you ₦5,000
5. **Reward** — when both have paid, you receive **₦10,000**
6. **Restart** — your matrix resets to **0**, status goes back to **Pending**
7. **Merge** — you are placed under another member building their matrix and pay **₦5,000** again
8. Go to step 3 — the cycle never ends

## Tech Stack

- Next.js 16 (App Router)
- Supabase (PostgreSQL + Auth + Realtime)
- TypeScript
- Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js 20.9+
- A [Supabase](https://supabase.com) project

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in the project root with your credentials (see **Project Settings → API** in Supabase):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Apply the database schema (tables `members`, `contributions` with Realtime enabled) via the Supabase SQL editor or CLI migrations.

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── members/        # Join, list, member details
│   │   ├── contributions/  # Contribution tracking
│   │   ├── matrix/         # Matrix tree data
│   │   └── stats/          # Community statistics
│   ├── join/               # Join form page
│   ├── members/            # Members list
│   ├── matrix/             # Matrix visualization
│   └── dashboard/          # Member dashboard
├── components/             # UI components
├── lib/
│   ├── matrix.ts           # Matrix placement & payout logic
│   ├── db/repository.ts    # Supabase data access
│   ├── supabase/           # Browser + server clients
│   └── constants.ts        # ₦5,000 / ₦10,000 amounts
├── hooks/
│   └── useRealtimeDashboard.ts  # Live dashboard updates
└── types/                  # Shared TypeScript types
```

## Realtime

The dashboard subscribes to Supabase Realtime on `members` and `contributions` changes (filtered to the logged-in member). Updates appear instantly without polling.

## Database scripts

| Command | Description |
|---------|-------------|
| `npm run repair:db` | Repair cycle/member state and backfill transactions |
| `npm run verify:db` | Quick state check |
| `npm run seed:test` | Seed test accounts |
| `npm run seed:admin` | Create or update the admin account |

## Admin Portal

Admin access uses the same Supabase Auth session with a `role` column on `members`.

1. Create the admin account:

```bash
npm run seed:admin
```

Default credentials (override via `.env`):
- Email: `admin@friendsrewardcircle.com`
- Password: `admin1234`

2. Sign in at [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### Admin routes

| Route | Description |
|-------|-------------|
| `/admin` | Community overview and stats |
| `/admin/members` | Member directory |
| `/admin/members/[id]` | Member detail and escalation actions |
| `/admin/contributions` | All payment activity |
| `/admin/escalations` | Members requiring admin contact |
| `/admin/settings` | Configure contribution & payout amounts |
| `/admin/activity` | Admin audit log of all actions |

### Admin capabilities

- **Manual matrix match** — assign a member to pay a specific upline (member detail page)
- **Suspend / unsuspend** — block member login and activity
- **Manage contributions** — confirm, decline, cancel, or change payment amounts
- **Platform settings** — update contribution (₦5,000) and payout (₦10,000) amounts globally
- **Activity log** — full audit trail of every admin action

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/members/join` | Join the community |
| GET | `/api/members` | List all members |
| GET | `/api/members/[id]` | Member details & progress |
| GET | `/api/matrix` | Matrix tree structure |
| GET | `/api/contributions` | All contributions |
| POST | `/api/contributions/[id]/confirm` | Confirm a payment |
| GET | `/api/transactions` | Member transaction ledger |
| GET | `/api/stats` | Community statistics |

## License

Private project.
