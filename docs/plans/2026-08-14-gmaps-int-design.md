# Google Maps Intelligence Dashboard — Design

**Date:** 2026-08-14 **Stack:** Deno 2 + Fresh 2.3.3 (tailwind 4), SQLite
(`@db/sqlite`), Google Places API (New), OpenRouter
(`nvidia/nemotron-3.5-lightning:free`) **URL:** https://gmaps.highranking.id
(nginx reverse proxy → 127.0.0.1:8010, systemd `gmaps-int`)

## Goal

Internal team tool. Search Google Maps by keyword + location, store results as
leads in SQLite, manage them in a login-protected dashboard. Mirrors
`gmaps-.html` workflow (SCAN → FILTER → SCORE) and its lead-tracker columns.
Public info only. No fabricated data. Human approves every AI suggestion.

## Schema

- `users(id, username UNIQUE, password_hash, created_at)`
- `search_jobs(id, keyword, location, created_by, created_at, result_count, new_count)`
- `leads(place_id UNIQUE PK, name, category, address, lat, lng, rating, review_count, website, phone, public_email, source_job_id, first_seen, last_seen, fit_score, priority, status, last_contacted, next_action, notes, ai_summary, ai_score, ai_priority, ai_reason, ai_at)`

Enums: priority HOT/WARM/SKIP, status NEW/CONTACTED/REPLIED/BOOKED.

## Components

- `db/` schema + migrate + seed; singleton db at `data/gmaps.db`
- `lib/places.ts` — Places API (New) `places:searchText`, field mask, 3 pages
  max 60 results
- `lib/score.ts` — rule-based fit_score 1–10 + priority
- `lib/ai.ts` — OpenRouter chat completion, public-fields-only prompt, JSON
  output `{summary, score, priority, reason}`
- `lib/auth.ts` — scrypt hash/verify (Deno std `crypto`), HMAC-signed session
  cookie, expiry
- routes: `/login`, `/` dashboard, `/search` POST, `/leads` table+filters,
  `/leads/:id` detail+edit, `/leads/export.csv`, `/api/leads/:id/ai` POST
- middleware: auth guard all but `/login`, `/static`, `/api` excluded except AI
  needs auth via session cookie check

## Rules from source doc (enforced)

- Public info only; never invent contact details or data
- Human approval before applying AI output (suggest → accept)
- No auto outreach; nothing sends anywhere

## Deployment

systemd unit runs `deno task prod` (build once, then
`deno serve -A _fresh/server.js`) on port 8010. nginx vhost
`gmaps.highranking.id` with certbot TLS. Secrets in `.env` (SESSION_SECRET,
PLACES_API_KEY, OPENROUTER_API_KEY).
