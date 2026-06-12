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
    return {
      markdown: renderMarkdown(audit),
      json: audit as unknown as Record<string, unknown>,
    };
  },
};
