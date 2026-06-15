/**
 * Report that renders the swamp-telemetry-audit resource into a human-readable summary.
 *
 * Method-scope: runs after `@henryrennerv/swamp-telemetry-audit`'s `scan` method, reads the
 * `audit` resource it produced, and renders it with swamp-logger's shared `renderMarkdown`
 * (vendored at `../models/audit_core.ts`) so the report and the standalone CLI emit identical output.
 *
 * @module
 */
import { type Audit, renderMarkdown } from "../models/audit_core.ts";

interface DataHandle {
  specName: string;
  name: string;
  version: number;
}

interface MethodReportContext {
  modelType: string;
  modelId: string;
  dataHandles: DataHandle[];
  dataRepository: {
    getContent: (
      modelType: string,
      modelId: string,
      name: string,
      version: number,
    ) => Promise<Uint8Array | null>;
  };
}

interface ReportResult {
  markdown: string;
  json: Record<string, unknown>;
}

/**
 * Shown when the event store is empty — i.e. the audit ran without its capture dependency,
 * `@henryrennerv/swamp-logger`, having produced anything. Lives here in the extension layer
 * (not vendored `audit_core.ts`) so the shared core stays byte-identical to swamp-logger's
 * standalone CLI; this guidance is swamp-extension-specific UX, not part of the audit format.
 */
const BOOTSTRAP_MARKDOWN = [
  `# swamp telemetry audit`,
  ``,
  `_No telemetry captured yet — the event store is empty._`,
  ``,
  `This audit only **consumes** events; capture is produced by its dependency,`,
  `[\`@henryrennerv/swamp-logger\`](https://swamp-club.com/extensions/@henryrennerv/swamp-logger).`,
  `Bootstrap it once:`,
  ``,
  `1. Pull the capture skill: \`swamp extension pull @henryrennerv/swamp-logger\``,
  `2. Start the listener (needs [Deno](https://deno.com)):`,
  `   \`\`\`bash`,
  `   deno run --allow-net --allow-read --allow-write --allow-env \\`,
  `     https://raw.githubusercontent.com/henry-renner-v/swamp-logger/main/swamp_logger.ts`,
  `   \`\`\``,
  `3. Point the repo's \`.swamp.yaml\` at it: \`telemetryEndpoint: http://127.0.0.1:8099\``,
  `4. Run \`swamp\` as usual, then re-run this model's \`scan\` method.`,
].join("\n");

/** Report definition: render the captured-telemetry audit as markdown + JSON. */
export const report = {
  name: "@henryrennerv/telemetry-audit",
  description:
    "Summarize what the swamp CLI phoned home, from swamp-logger's captured telemetry.",
  scope: "method" as const,
  labels: ["audit", "telemetry", "privacy"],
  execute: async (context: MethodReportContext): Promise<ReportResult> => {
    const handle = context.dataHandles.find((h) => h.specName === "audit");
    if (!handle) {
      return {
        markdown: "_No audit data produced — run `scan` first._",
        json: {},
      };
    }
    const raw = await context.dataRepository.getContent(
      context.modelType,
      context.modelId,
      handle.name,
      handle.version,
    );
    if (!raw) {
      return { markdown: "_Audit data not found._", json: {} };
    }
    const audit = JSON.parse(new TextDecoder().decode(raw)) as Audit;
    // Empty store ⇒ the capture dependency hasn't produced anything. Render setup guidance
    // instead of a confusing "0 event(s) captured" report. JSON still carries the real audit.
    if (audit.eventCount === 0 && audit.rawCount === 0) {
      return {
        markdown: BOOTSTRAP_MARKDOWN,
        json: audit as unknown as Record<string, unknown>,
      };
    }
    return {
      markdown: renderMarkdown(audit),
      json: audit as unknown as Record<string, unknown>,
    };
  },
};
