# @henryrennerv/swamp-logger

A skills-only swamp extension that teaches an agent (or a human) how to **capture, log, and
audit the telemetry the `swamp` CLI emits**, using the standalone
[swamp-logger](https://github.com/henry-renner-v/swamp-logger) tool.

The capture deliberately runs **outside** swamp: a swamp extension executes *inside* the CLI
and cannot intercept the CLI's own outbound telemetry. This extension therefore ships
*guidance*, not capture logic — it points swamp's official per-repo `telemetryEndpoint` override
at a local swamp-logger process.

## Install

```bash
swamp extension pull @henryrennerv/swamp-logger
```

This installs the `swamp-logger` skill into your tool's skill directory (e.g.
`.claude/skills/swamp-logger/`).

## Use

Run the swamp-logger listener, then point a repo's `.swamp.yaml` at it:

```yaml
# .swamp.yaml
telemetryEndpoint: http://127.0.0.1:8099
```

```bash
deno run --allow-net --allow-read --allow-write --allow-env \
  https://raw.githubusercontent.com/henry-renner-v/swamp-logger/main/swamp_logger.ts
```

Every `swamp` invocation's telemetry is then written one-file-per-event locally, optionally
POSTed to a `--sink` receiver of your choosing, and forwarded upstream unchanged. To stop
telemetry entirely instead of logging it, use swamp's own switch (`--no-telemetry` /
`SWAMP_NO_TELEMETRY=1`).

See the skill (`SKILL.md`) for the full setup, options, and the captured event schema.

## License

MIT.
