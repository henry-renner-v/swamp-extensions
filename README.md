# swamp-extensions

General, reusable [swamp](https://github.com/swamp-club/swamp) extensions published under the
`@henryrennerv` collective. Everything here is parameterized and instance-free — no personal
or homelab-specific values.

## Extensions

- **`@henryrennerv/swamp-telemetry-audit`** (`extensions/swamp-telemetry-audit/`) — a model +
  report that turn a swamp-logger event store into a repeatable audit: commands run, the stable
  `distinct_id`/`$repo_id` fingerprint, environment, AI-agent detection, and failed invocations.
  Shared analysis core is vendored at `extensions/models/audit_core.ts`.
- **`@henryrennerv/swamp-logger`** (`extensions/swamp-logger/`) — a skill that wires swamp's
  per-repo `telemetryEndpoint` override to a local
  [swamp-logger](https://github.com/henry-renner-v/swamp-logger) process so its telemetry can be
  captured and audited.

## Layout

Typed extension source lives under `extensions/` (swamp's default `typedDir` resolution):

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
