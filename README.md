# North Hall Event Desk

Staff desk for North Hall Conference Center. Production, catering, and facilities share one room calendar, flag double bookings (including setup and teardown), and print a one-page event résumé.

## Demo login

| | |
| --- | --- |
| Email | `sv@northhall.example` |
| Password | `harbor-demo` |

The account is named **SV**, Production Coordinator. The login screen can fill these in for you.

## Run locally

Requires Node.js 22.23.4 (the version pinned for Render).

```bash
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

With the server running, `node scripts/verify.mjs` signs in, creates a hold, checks that an overlap and a buffer clash are rejected, checks the over-capacity warning, drafts a résumé, and downloads a PDF.

`npm run dev` creates the SQLite database, loads the sample rooms and events when the database is empty, and starts the app. Sample events are placed around today in Central Time.

Production, including Render:

```bash
npm ci --include=dev
npm run build
npm start
```

`npm start` listens on `0.0.0.0` and `PORT` (default `43123`). On startup it applies the SQLite schema and seeds the demo account when the database is empty. The disk on Render’s free plan is ephemeral, so a fresh instance comes back with the sample week and `sv@northhall.example` / `harbor-demo`. Leave `OPENAI_API_KEY` unset to draft résumés with the built-in template.

`render.yaml` defines a free Node web service. This repository is on Cursor Origin, not GitHub, GitLab, or Bitbucket, so Render cannot clone it until it is mirrored to one of those hosts.

Reset the sample week:

```bash
npm run db:reset
```

That wipes the local database and reseeds it. Events you added are removed too.

## What you can do

- **Calendar.** Day view is a room timeline from 6 AM to 10 PM. Hatched edges are setup and teardown. Week view lists every hold. Click an open slot or **New event**.
- **Conflicts.** Saving is blocked when a hold overlaps another event in the same room, including buffers. Headcount over the setup’s posted capacity, or a setup the room does not offer, must be acknowledged before it saves.
- **Rooms.** Fifteen sample rooms, with capacity by setup style (theater, classroom, U-shape, boardroom, rounds, reception). Add or edit rooms from the Rooms page.
- **Event résumé.** Open an event and choose **Event résumé**. Print it, or download a PDF. **Draft from notes** builds the timeline from the schedule, catering, and coordinator notes.
- **History.** Search past events and duplicate one for the next occurrence. Set a new date before saving.

## Optional model draft

Without a key, **Draft from notes** uses the built-in template. To use a model, create a `.env` file:

```bash
OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
# SESSION_SECRET=replace-this-in-a-shared-deployment
```

If the model request fails, the desk falls back to the template.

## Data

SQLite file: `prisma/dev.db` (not committed). Schema: `prisma/schema.prisma`.
