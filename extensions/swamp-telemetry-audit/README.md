# @henryrennerv/swamp-telemetry-audit

A swamp model + report that audits the telemetry the `swamp` CLI phones home,
turning [swamp-logger](https://github.com/henry-renner-v/swamp-logger)'s
captured event store into a repeatable swamp pipeline.

> **Companion — capture first.** This is the **audit** half of a pair. The
> **capture** half is the
> [`@henryrennerv/swamp-logger`](https://swamp-club.com/extensions/@henryrennerv/swamp-logger)
> skill, which records swamp's telemetry into an event store. Install both,
> capture, then audit:
>
> ```bash
> swamp extension pull @henryrennerv/swamp-logger          # capture skill (sets up the event store)
> swamp extension pull @henryrennerv/swamp-telemetry-audit # this audit model+report
> ```

It is the swamp-native **consumer** of swamp-logger's capture: swamp-logger (a
standalone tool) records one file per telemetry event; this extension reads that
store and summarizes it. The two are deliberately separate, swappable consumers
— the only thing shared across the boundary is the documented event schema
(swamp-logger's `PROTOCOL.md`). The analysis logic is **vendored** from
swamp-logger's `audit.ts` into
[`extensions/models/audit_core.ts`](../models/audit_core.ts) (provenance-pinned
to an upstream commit), so this report and swamp-logger's standalone `audit.ts`
CLI produce identical output.

## What it reports

From the captured events: every command run, the stable identifiers that
fingerprint you (`distinct_id`) and your repositories (`$repo_id`),
swamp/Deno/platform versions, whether an AI agent was driving
(`agentSessionDetected`, `configuredAiTools`), and any failed invocations.

## Use

```bash
# 1. Capture telemetry first with the @henryrennerv/swamp-logger skill
#    (swamp extension pull @henryrennerv/swamp-logger), pointing
#    .swamp.yaml `telemetryEndpoint:` at it so events/ fills up.

# 2. Point this model at that events directory and scan:
swamp model create @henryrennerv/swamp-telemetry-audit my-audit \
  --global-arg eventsDir=events
swamp model method run my-audit scan      # runs the audit report automatically

# 3. Read the rendered audit any time:
swamp report get @henryrennerv/telemetry-audit --model my-audit --markdown
```

Sample of what `scan` surfaces:

```
# swamp telemetry audit
7 event(s) captured (+2 unparsed) · window 2026-06-12T01:23 → 01:24

## What it phones home
- Stable user identifier present: 1 distinct `distinct_id` across 7 event(s).
- 1 repository fingerprinted via `$repo_id`.
- AI-agent driving detected in 0/7 invocation(s) (configured tools: claude).
```

| Piece  | Name                                  | Purpose                                         |
| ------ | ------------------------------------- | ----------------------------------------------- |
| Model  | `@henryrennerv/swamp-telemetry-audit` | `scan` reads the event store → `audit` resource |
| Report | `@henryrennerv/telemetry-audit`       | renders the `audit` resource as markdown + JSON |

### Global arguments

| Arg         | Default  | Meaning                                                                            |
| ----------- | -------- | ---------------------------------------------------------------------------------- |
| `eventsDir` | `events` | Where swamp-logger writes per-event files. Absolute, or relative to the repo root. |

## License

MIT — see [LICENSE.txt](LICENSE.txt).
