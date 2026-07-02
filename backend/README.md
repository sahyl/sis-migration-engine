# SIS Migration Engine

## run

```
docker compose up -d
npm install
npm run migrate
npm run dev       # api on :4000/graphql
npm run worker    # separate terminal
```

## flow

upload students.csv + classes.csv -> `startImport` -> validation runs sync ->
if `needs_review`, fetch `problemRows`, fix via `editStagingRow` / `resolveConflict`,
call `revalidateJob` -> repeat until clean -> `confirmAndQueue` -> workers commit.

## cut for MVP

- students + classes only, no teachers table (class.teacher_email not FK-checked)
- CSV only, no PowerSchool parser
- no subscriptions, poll `importJob` for progress
- no auth/multi-tenant enforcement beyond passing schoolId manually
