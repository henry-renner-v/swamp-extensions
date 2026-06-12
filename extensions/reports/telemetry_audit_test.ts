/**
 * Unit tests for the telemetry-audit report. The success path seeds an `audit` resource and
 * asserts the rendered markdown + JSON; the failure path provides no `audit` handle and asserts
 * the graceful "no data" message. Markdown fidelity itself is covered by swamp-logger's
 * audit_test.ts; these tests cover the report's handle lookup and decode wiring.
 */
import { createReportTestContext } from "jsr:@swamp-club/swamp-testing";
import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { report } from "./telemetry_audit.ts";

const audit = {
  eventCount: 1,
  rawCount: 0,
  timeRange: {
    first: "2026-06-12T01:00:00.000Z",
    last: "2026-06-12T01:00:00.000Z",
  },
  commands: { model: 1 },
  results: { success: 1 },
  optionKeys: ["--json"],
  fingerprint: { distinctIds: ["user-1"], repoIds: ["repo-1"] },
  environment: { swampVersions: [], denoVersions: [], platforms: [] },
  context: {
    agentSessionDetected: {},
    isInteractive: {},
    detectedAiTools: [],
    configuredAiTools: [],
    externalDatastoreConfigured: {},
  },
  failures: [],
  findings: [],
};

const MODEL_TYPE = "@henryrennerv/swamp-telemetry-audit";
const MODEL_ID = "tel-audit";

Deno.test("report renders the audit resource as markdown + JSON", async () => {
  const content = new TextEncoder().encode(JSON.stringify(audit));
  const { context } = createReportTestContext({
    scope: "method",
    modelType: MODEL_TYPE,
    modelId: MODEL_ID,
    methodName: "scan",
    executionStatus: "succeeded",
    dataHandles: [{
      name: "current",
      specName: "audit",
      kind: "resource",
      dataId: "d1",
      version: 1,
      size: content.length,
      tags: { type: "resource", specName: "audit" },
      metadata: {
        contentType: "application/json",
        lifetime: "infinite",
        garbageCollection: 10,
        streaming: false,
        tags: { type: "resource", specName: "audit" },
        ownerDefinition: { ownerType: "model-method", ownerRef: "scan" },
      },
    }],
    dataArtifacts: [{
      modelType: MODEL_TYPE,
      modelId: MODEL_ID,
      data: {
        name: "current",
        kind: "resource",
        dataId: "d1",
        version: 1,
        size: content.length,
        contentType: "application/json",
      },
      content,
    }],
  });

  const result = await report.execute(
    context as unknown as Parameters<typeof report.execute>[0],
  );

  assertStringIncludes(result.markdown, "# swamp telemetry audit");
  assertStringIncludes(result.markdown, "## Commands run");
  assertEquals((result.json as { eventCount: number }).eventCount, 1);
});

Deno.test("report returns a graceful message when no audit data is present", async () => {
  const { context } = createReportTestContext({
    scope: "method",
    modelType: MODEL_TYPE,
    modelId: MODEL_ID,
    methodName: "scan",
    executionStatus: "succeeded",
    dataHandles: [],
  });

  const result = await report.execute(
    context as unknown as Parameters<typeof report.execute>[0],
  );

  assertStringIncludes(result.markdown, "No audit data produced");
  assertEquals(result.json, {});
});
