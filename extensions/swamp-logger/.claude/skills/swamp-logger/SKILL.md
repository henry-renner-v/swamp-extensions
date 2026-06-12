---
name: swamp-logger
description: >
  Use to capture, log, or audit the telemetry the swamp CLI sends to swamp-club — see exactly
  what your tooling phones home and keep an auditable record, while optionally still letting it
  through. Triggers on "log swamp telemetry", "audit swamp telemetry", "what does swamp send /
  phone home", "capture swamp telemetry", "swamp-logger", "swamp telemetry endpoint".
license: MIT
---

# swamp-logger

Capture the telemetry the `swamp` CLI emits, persist it, and (optionally) forward it upstream
unchanged — using the standalone, dependency-free
[swamp-logger](https://github.com/henry-renner-v/swamp-logger) tool (Deno/TypeScript).

The capture happens **outside** swamp on purpose: a swamp extension runs *inside* the CLI and
cannot intercept the CLI's own outbound telemetry. swamp-logger is a tiny local HTTP listener;
swamp's official per-repo `telemetryEndpoint` override points telemetry at it.

## How it works

```
swamp CLI ──POST /ingest──▶ swamp-logger ──┬──▶ one file per event (events/YYYY/MM/DD/…)
                                           ├──▶ optional --sink URL (a receiver you run)
                                           └──▶ forwarded upstream, unchanged
```

## Set up (per repo you want to observe)

1. **Run swamp-logger** (needs [Deno](https://deno.com)):

   ```bash
   # from a clone:
   deno run --allow-net --allow-read --allow-write --allow-env swamp_logger.ts
   # or directly from source:
   deno run --allow-net --allow-read --allow-write --allow-env \
     https://raw.githubusercontent.com/henry-renner-v/swamp-logger/main/swamp_logger.ts
   ```

   It listens on `http://127.0.0.1:8099` by default.

2. **Point swamp at it** — add to the repo's `.swamp.yaml`:

   ```yaml
   telemetryEndpoint: http://127.0.0.1:8099
   ```

   This is swamp's supported, telemetry-only override (it does **not** affect auth, the
   registry, or anything else). Resolution order: `.swamp.yaml telemetryEndpoint` > localhost
   auto-detect > default `https://telemetry.swamp-club.com`.

3. **Use `swamp` normally.** Every invocation's telemetry batch is now captured.

## Options

| Need | How |
| --- | --- |
| Send each event to your own receiver (DB, git, cluster) | `--sink http://your-receiver/ingest` |
| Capture only — don't forward to swamp-club | `--no-forward` |
| Don't write local files (sink only) | `--no-files` |
| Change port / output dir | `--port`, `--out` |

The persistence backend is intentionally **not** part of the tool: run a small receiver at the
`--sink` URL to commit to a git repo, write to a database, or store in your cluster, and swap it
without touching swamp-logger.

## Turning telemetry off instead of logging it

If the goal is to stop telemetry rather than record it, use swamp's own switch — no logger
needed: the `--no-telemetry` flag or `SWAMP_NO_TELEMETRY=1`.

## What gets captured

PostHog-style `cli_invocation` events: the command run, option *keys* (not values), result and
timing, swamp/deno versions, platform, whether an AI agent is driving, and `distinct_id` /
`$repo_id`. See swamp-logger's `PROTOCOL.md` for the full schema. Local files are deduped by
event id (idempotent); sink delivery is at-least-once, so a receiver should key on
`event.properties.id`.
