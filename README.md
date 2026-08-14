# GMaps Intelligence

Lead dashboard for Google Maps scraping. Deno + Fresh 2, SQLite, Places API
(New), OpenRouter AI.

## Run

```bash
deno task build
deno task seed <user> <pass>   # add/update user
deno task start                # port 8000 (systemd unit uses 8010)
```

## Env (.env)

- `SESSION_SECRET` — HMAC key for session cookies
- `PLACES_API_KEY` — Google Places API (New) key
- `OPENROUTER_API_KEY` — OpenRouter key (model:
  nvidia/nemotron-3.5-lightning:free)

## Deploy (this server)

- systemd: `gmaps-int.service` → 127.0.0.1:8010
- nginx: `sites-available/gmaps-int` → TLS via certbot
- URL: https://gmaps.highranking.id

## Tests

```bash
deno task test
```

## Rules (from source workflow doc)

Public info only. Never invent data. AI suggestions require human approval. No
auto outreach.
