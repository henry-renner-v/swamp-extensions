# swamp-extensions

General, reusable [swamp](https://github.com/swamp-club/swamp) extensions
published under the `@henryrennerv` collective. Everything here is parameterized
and instance-free — no personal or homelab-specific values.

## Extensions

- **`@henryrennerv/swamp-telemetry-audit`**
  (`extensions/swamp-telemetry-audit/`) — a model + report that turn a
  swamp-logger event store into a repeatable audit: commands run, the stable
  `distinct_id`/`$repo_id` fingerprint, environment, AI-agent detection, and
  failed invocations. Shared analysis core is vendored at
  `extensions/models/audit_core.ts`.
- **`@henryrennerv/swamp-logger`** (`extensions/swamp-logger/`) — a skill that
  wires swamp's per-repo `telemetryEndpoint` override to a local
  [swamp-logger](https://github.com/henry-renner-v/swamp-logger) process so its
  telemetry can be captured and audited.

## How they fit together

```
github.com/henry-renner-v/swamp-logger   ── the standalone Deno capture tool (separate repo)
            ▲  driven by
@henryrennerv/swamp-logger                ── skill:        CAPTURE swamp's telemetry → event store
            ▼  feeds
@henryrennerv/swamp-telemetry-audit       ── model+report: AUDIT that event store
```

Pull the **swamp-logger** skill to capture, then the **swamp-telemetry-audit**
model+report to summarize what was captured. The skill points at the independent
tool repo above; the audit vendors that tool's analysis core
(`extensions/models/audit_core.ts`) so its output matches the tool's standalone
`audit.ts`.

## Layout

Typed extension source lives under `extensions/` (swamp's default `typedDir`
resolution):

```
extensions/
  models/     # model source + vendored audit core
  reports/    # report source
  swamp-logger/           # skill manifest + docs
  swamp-telemetry-audit/  # model+report manifest + docs
```

## Develop / publish

```bash
swamp extension fmt     extensions/<name>/manifest.yaml --check
swamp extension quality extensions/<name>/manifest.yaml
deno test -A extensions/
swamp extension push    extensions/<name>/manifest.yaml
```
