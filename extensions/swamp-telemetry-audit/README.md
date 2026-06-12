# @henryrennerv/swamp-telemetry-audit

A swamp model + report that audits the telemetry the `swamp` CLI phones home, turning
[swamp-logger](https://github.com/henry-renner-v/swamp-logger)'s captured event store into a
repeatable swamp pipeline.

It is the swamp-native **consumer** of swamp-logger's capture: swamp-logger (a standalone tool)
records one file per telemetry event; this extension reads that store and summarizes it. The two
are deliberately separate, swappable consumers — the only thing shared across the boundary is the
documented event schema (swamp-logger's `PROTOCOL.md`). The analysis logic is imported directly
from swamp-logger (pinned to a commit), so this report and swamp-logger's standalone `audit.ts`
CLI produce identical output.

## What it reports

From the captured events: every command run, the stable identifiers that fingerprint you
(`distinct_id`) and your repositories (`$repo_id`), swamp/Deno/platform versions, whether an AI
agent was driving (`agentSessionDetected`, `configuredAiTools`), and any failed invocations.

## Use

```bash
# 1. Capture telemetry first with swamp-logger (see that repo), pointing
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

| Piece | Name | Purpose |
| --- | --- | --- |
| Model | `@henryrennerv/swamp-telemetry-audit` | `scan` reads the event store → `audit` resource |
| Report | `@henryrennerv/telemetry-audit` | renders the `audit` resource as markdown + JSON |

### Global arguments

| Arg | Default | Meaning |
| --- | --- | --- |
| `eventsDir` | `events` | Where swamp-logger writes per-event files. Absolute, or relative to the repo root. |

## License

MIT — see [LICENSE.txt](LICENSE.txt).
