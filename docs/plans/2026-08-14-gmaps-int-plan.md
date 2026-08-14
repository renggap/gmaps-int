# GMaps Intelligence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Login-protected lead dashboard: Places API search → SQLite leads →
filter/score/AI-score/export.

**Architecture:** Fresh 2 SSR pages + server actions; SQLite via `@db/sqlite`;
provider/lib modules pure and testable; auth via signed cookie middleware.

**Stack:** Deno 2, Fresh 2.3.3, tailwind 4, @db/sqlite, Deno std crypto.

---

### Task 1: DB layer

**Files:** `db/schema.sql`, `db/db.ts`, `db/seed.ts`, `lib/db_test.ts` Steps:
schema tables (users, search_jobs, leads) → `openDb(path)` runs schema
idempotently → tests: create temp db, insert lead, unique place_id enforced →
`deno test -A lib/` → commit.

### Task 2: Auth

**Files:** `lib/auth.ts`, `lib/auth_test.ts`, `routes/login.tsx`, middleware in
`main.ts` Steps: scrypt hash/verify, HMAC session token `{u,exp}` base64url +
sig, cookie `gmaps_session` 7d → tests hash/verify roundtrip, token forge
rejected → login page POST verify + set cookie → middleware redirect `/login`
when unauthenticated (skip `/login`, `/static`, `/_frsh`) → seed user renggap →
test → commit.

### Task 3: Places provider

**Files:** `lib/places.ts`, `lib/places_test.ts`,
`tests/fixtures/places_page.json` Steps:
`searchPlaces(key, query, location, fetchFn)` → POST `places:searchText`
X-Goog-FieldMask, paginate `nextPageToken` up to 3 pages / 60 results →
`parsePlaces(json) -> LeadData[]` pure → tests vs fixture (counts, field
mapping, missing fields null-safe) → commit.

### Task 4: Search flow

**Files:** `lib/leads.ts`, `lib/leads_test.ts`, `routes/search.tsx` Steps:
`runSearch(db, job, leadDatas)` → upsert on place_id (update last_seen + fields,
keep score/status/notes) → create search_job row → tests: new insert, re-run
dedupe keeps manual edits → route POST form → redirect `/leads?job=<id>` →
commit.

### Task 5: Rule scoring

**Files:** `lib/score.ts`, `lib/score_test.ts` Steps:
`scoreLead(lead) -> {fit_score, priority}` from rating (0–3), reviews log scale
(0–4), website (0–2), phone/email (0–1) → HOT ≥8, WARM ≥5, SKIP else →
table-driven tests incl. nulls → apply on ingest → commit.

### Task 6: UI dashboard + leads

**Files:** `routes/index.tsx`, `routes/leads.tsx`, `routes/leads/[id].tsx`,
`components/*` Steps: dashboard cards (counts by priority/status, recent jobs,
search form) → leads table: filters q, priority, status, min_rating,
max_reviews?, job, sorting, pagination 50 → detail: all fields, edit form POST,
AI button island → commit.

### Task 7: AI research

**Files:** `lib/ai.ts`, `lib/ai_test.ts`, `routes/api/leads/[id]/ai.tsx` Steps:
`aiResearch(lead, key, fetchFn)` prompt = public fields only + doc rules + JSON
schema → parse `{summary, score, priority, reason}` → tests: prompt contains
fields, response parse, garbage → error, no network (mock fetch) → route POST:
calls, stores ai_* suggestion fields, does NOT overwrite fit_score until user
accepts → commit.

### Task 8: Export + hardening

**Files:** `routes/leads/export.csv.tsx`, `lib/ratelimit.ts` Steps: CSV of
filtered query, all tracker columns → login rate-limit 5/15min per IP+username
in-memory → session expiry check → commit.

### Task 9: Deploy

**Files:** `gmaps-int.service`, nginx conf
`/etc/nginx/sites-available/gmaps-int` Steps: `deno task build` → systemd unit
port 8010 → nginx proxy + certbot `--nginx -d gmaps.highranking.id` → smoke:
curl login redirect, https valid → commit + docs runbook.

Run tests: `deno test -A lib/ tests/`. Prod:
`deno task build && deno task start`.
