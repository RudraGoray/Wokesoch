# WS·MUN 1.0 — Backend

A small Node.js/Express backend for the WS·MUN prototype site. It does two things
the static prototype couldn't:

1. **Serves committee / schedule / secretariat data from the server** instead of
   hardcoded JS arrays, with admin endpoints to update them (fill in a TBA name,
   flip a committee from `FILLING` to `CLOSED`, etc.) without touching the frontend.
2. **Actually collects registrations.** The "Register as delegate / delegation /
   Apply for EB" buttons used to just `alert('...TBA')`. They now open a real form
   that POSTs to the backend and gets stored.

## Setup

```bash
cd wsmun-backend
npm install
cp .env.example .env
# edit .env and set ADMIN_KEY to a real secret
npm start
```

Visit `http://localhost:3000` — this serves `public/index.html`, which now fetches
its content from the API on load instead of using hardcoded arrays.

Use `npm run dev` (requires the `nodemon` devDependency, already in package.json)
for auto-restart while editing.

## Data storage

Content lives in flat JSON files under `data/` (`committees.json`, `schedule.json`,
`secretariat.json`, `registrations.json`). This keeps the project dependency-free
and easy to inspect/edit by hand. Writes go through a tiny per-file queue
(`src/db.js`) so two concurrent requests can't corrupt a file. If you outgrow this
(concurrent editors, need for querying/reporting), swap `src/db.js` for a real
database — the route files only call `readCollection` / `writeCollection`, so the
rest of the app doesn't need to change.

## API

All public endpoints are read-only `GET`s. Admin endpoints require a
`x-admin-key: <ADMIN_KEY>` header.

| Method | Path                     | Auth  | Description |
|--------|--------------------------|-------|-------------|
| GET    | `/api/committees`        | —     | List all committees |
| GET    | `/api/committees/:slug`  | —     | One committee |
| PATCH  | `/api/committees/:slug`  | admin | Update status/name/eb/etc. |
| GET    | `/api/schedule`          | —     | Full programme |
| PUT    | `/api/schedule`          | admin | Replace the whole programme |
| GET    | `/api/secretariat`       | —     | Full roster |
| PATCH  | `/api/secretariat/:order`| admin | Fill in a name/role for a seat |
| POST   | `/api/register`          | —     | Submit a registration |
| GET    | `/api/register`          | admin | List registrations (`?tier=`, `?status=`) |
| PATCH  | `/api/register/:id`      | admin | Move a registration to confirmed/waitlisted/rejected |
| GET    | `/api/health`            | —     | Liveness check |

### Example: submit a delegate registration

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "delegate",
    "fullName": "Jordan Rao",
    "email": "jordan@example.com",
    "phone": "+91-9000000000",
    "committeePreference": "unsc"
  }'
```

### Example: mark a committee CLOSED (admin)

```bash
curl -X PATCH http://localhost:3000/api/committees/unsc \
  -H "Content-Type: application/json" \
  -H "x-admin-key: <your ADMIN_KEY>" \
  -d '{"status": "CLOSED"}'
```

### Example: view registrations (admin)

```bash
curl http://localhost:3000/api/register \
  -H "x-admin-key: <your ADMIN_KEY>"
```

## What changed in the frontend

`public/index.html` is the same design/CSS as your prototype. The differences:

- The `committees` / `schedule` / `secretariat` arrays are gone; a `loadData()`
  function fetches them from `/api/...` on page load and calls `renderAll()`,
  which is the same rendering logic your prototype already had, just wrapped
  in a function so it can re-run after the fetch resolves.
- The three registration buttons (`Register as delegate`, `Register a
  delegation`, `Apply for EB`) now open a small modal (`#reg-modal`) instead of
  firing `alert(...)`. The modal POSTs to `/api/register` and shows the
  server's response (confirmation ID, or validation errors) inline.

## Notes / things you'll likely want to change

- **CORS** is wide open (`cors()` with no options) since frontend and backend
  are served from the same origin here. Lock it down if you split them.
- **Duplicate registration check** is a simple same-email-same-tier match —
  fine for a single conference, not meant as real fraud prevention.
- No email confirmations are sent — add a mailer (e.g. Nodemailer + your SMTP
  provider) in `src/routes/register.js` after a successful save if you want that.
- Nothing here handles payments; the fee tiers are still marked `Fee TBA` in
  the UI on purpose, since the prototype didn't have pricing data to work with.
