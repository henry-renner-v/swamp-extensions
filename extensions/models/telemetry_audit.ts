/**
 * Swamp-native surface over the standalone swamp-logger audit.
 *
 * This model is a thin wrapper: it reads the on-disk event store that the external
 * `swamp-logger` tool captures and turns it into swamp data + a report, so "audit my swamp
 * telemetry" becomes a repeatable `swamp model method run` pipeline. All analysis logic is
 * reused from swamp-logger's `audit.ts`, vendored at `./audit_core.ts` (which records the
 * pinned upstream commit). The only
 * contract shared across the boundary is the documented event schema (PROTOCOL.md). Capture
 * and audit stay separate, swappable consumers; this is the swamp-native one.
 *
 * @module
 */
import { z } from "npm:zod@4";
import { type Audit, auditDir } from "./audit_core.ts";

const GlobalArgsSchema = z.object({
  eventsDir: z.string().default("events").describe(
    "Directory the swamp-logger tool writes per-event files to. Absolute, or relative to repoDir.",
  ),
});

type GlobalArgs = z.infer<typeof GlobalArgsSchema>;

const CountMap = z.record(z.string(), z.number());

/** Resource schema — mirrors the `Audit` shape produced by swamp-logger's audit core. */
const AuditSchema = z.object({
  eventCount: z.number(),
  rawCount: z.number(),
  timeRange: z.object({
    first: z.string().nullable(),
    last: z.string().nullable(),
  }),
  commands: CountMap,
  results: CountMap,
  optionKeys: z.array(z.string()),
  fingerprint: z.object({
    distinctIds: z.array(z.string()),
    repoIds: z.array(z.string()),
  }),
  environment: z.object({
    swampVersions: z.array(z.string()),
    denoVersions: z.array(z.string()),
    platforms: z.array(z.string()),
  }),
  context: z.object({
    agentSessionDetected: CountMap,
    isInteractive: CountMap,
    detectedAiTools: z.array(z.string()),
    configuredAiTools: z.array(z.string()),
    externalDatastoreConfigured: CountMap,
  }),
  failures: z.array(z.object({
    command: z.string(),
    status: z.string(),
    exitCode: z.number(),
    at: z.string().nullable(),
  })),
  findings: z.array(z.string()),
});

/** Resolve the configured events directory against the repo root when it is relative. */
function resolveEventsDir(repoDir: string, eventsDir: string): string {
  return eventsDir.startsWith("/") ? eventsDir : `${repoDir}/${eventsDir}`;
}

interface ScanContext {
  globalArgs: GlobalArgs;
  repoDir: string;
  writeResource: (
    specName: string,
    name: string,
    data: Record<string, unknown>,
  ) => Promise<{ name: string }>;
  logger: { info: (msg: string, args?: Record<string, unknown>) => void };
}

/** Model definition: scan the swamp-logger event store into an auditable swamp resource. */
export const model = {
  type: "@henryrennerv/swamp-telemetry-audit",
  version: "2026.06.12.4",
  reports: ["@henryrennerv/telemetry-audit"],
  globalArguments: GlobalArgsSchema,
  resources: {
    "audit": {
      description:
        "Summary of what the swamp CLI phoned home, derived from captured telemetry.",
      schema: AuditSchema,
      lifetime: "infinite" as const,
      garbageCollection: 10,
    },
  },
  methods: {
    scan: {
      description:
        "Read swamp-logger's captured events and summarize the telemetry: commands, the stable " +
        "distinct_id/$repo_id fingerprint, environment, AI-agent detection, and failed runs.",
      arguments: z.object({}),
      execute: async (
        _args: Record<string, never>,
        context: ScanContext,
      ): Promise<{ dataHandles: Array<{ name: string }> }> => {
        const dir = resolveEventsDir(
          context.repoDir,
          context.globalArgs.eventsDir,
        );
        context.logger.info("Scanning swamp-logger event store at {dir}", {
          dir,
        });
        const audit: Audit = (await auditDir(dir)).json;
        const handle = await context.writeResource(
          "audit",
          "current",
          audit as unknown as Record<string, unknown>,
        );
        context.logger.info(
          "Audited {eventCount} event(s) and {rawCount} raw record(s) from {dir}",
          { eventCount: audit.eventCount, rawCount: audit.rawCount, dir },
        );
        return { dataHandles: [handle] };
      },
    },
  },
};
