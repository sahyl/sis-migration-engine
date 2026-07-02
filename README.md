# SIS Migration Engine

Bulk import tool for migrating school data (students, classes) into a Toddle-style system. Staging → validate → resolve conflicts → queue → commit, with per-row failure isolation.

## Stack

Node.js, Express, Apollo Server (GraphQL), PostgreSQL, Knex, BullMQ + Redis — backend.
Next.js, Apollo Client — frontend.

## Run

```bash
cd backend
docker compose up -d
npm install
npm run migrate
npm run dev       # api on :4000/graphql
npm run worker    # separate terminal
```

```bash
cd frontend
npm install
npm run dev        # :3000
```

Upload page at `/`, review page at `/review/<jobId>`.

## Flow

```
upload CSVs (students.csv + classes.csv)
  → staged as raw rows (import_staging_rows)
  → schema validation (zod)
  → reference validation (student.class_code must exist)
  → conflict detection:
      - intra-batch duplicates (same email/class_code twice in one file)
      - prod collisions (already exists in DB)
  → if anything's not 'valid': stuck at needs_review, shown on /review/<jobId>
  → admin edits bad rows or resolves conflicts (delete / overwrite)
  → revalidate, repeat until clean
  → confirm & queue → BullMQ workers commit in batches, transaction per row
  → commit_failed rows (DB errors not caught earlier) surfaced same as any other problem row
```

## Data model

- `import_jobs` — one row per upload attempt, tracks status/counts
- `import_staging_rows` — every uploaded row, raw + edited data, status, errors
- `students`, `classes` — target prod tables (stand-ins for real Toddle schema)

## What's actually built

- CSV parsing (streamed, not loaded fully into memory)
- Schema validation per entity type
- Reference validation (student → class)
- Conflict detection for **both** students and classes: intra-batch duplicates + prod collisions
- Manual resolution: edit / delete / overwrite (overwrite does a real `UPDATE` against `matched_entity_id`)
- Queue-based commit with per-row transaction isolation — one bad row doesn't kill the batch
- Review UI: problem-rows table, inline edit, resolve buttons, live status polling

## Known gaps (by design, MVP scope)

- Students + classes only, no teachers table — `class.teacher_email` isn't checked against anything real
- CSV only, no PowerSchool/real SIS parser
- No auth — `school_id` hardcoded on the frontend
- No subscriptions, polling only

## Known gaps (not by design — scale limitations)

- Conflict/reference checks are row-by-row DB queries (N+1). Fine at dozens of rows, not fine at thousands — needs to become one bulk query + in-memory `Set` lookup.
- Worker commits one row per transaction. Real scale needs bulk `INSERT ... VALUES (...), (...)` with fallback to row-by-row only on batch failure.
- No idempotency key on uploads — re-uploading the same file creates a new job, doesn't detect "you already ran this."
- No cleanup/retention on `import_staging_rows` — grows unbounded.
- Raw Postgres error strings surfaced directly to `errors` column instead of mapped to typed, user-facing error codes.
- No queue isolation per school — one school's large import can starve another's.

## Sample data

See `sample-data/` for CSVs with deliberately planted issues (schema errors, reference errors, intra-batch and prod-collision conflicts) — useful for demoing the review flow end to end.
