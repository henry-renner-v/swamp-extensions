/**
 * Unit tests for the swamp-telemetry-audit model's swamp wiring: dir resolution,
 * `writeResource`, and entry/exit logging. The success path feeds a populated event store; the
 * edge path points at a missing store (swamp-logger's `loadRecords` degrades to an empty audit
 * rather than throwing). Analysis correctness itself is covered by swamp-logger's audit_test.ts.
 */
import { createModelTestContext } from "jsr:@swamp-club/swamp-testing";
import { assertEquals } from "jsr:@std/assert";
import { model } from "./telemetry_audit.ts";

const sampleEvent = {
  receivedAt: "2026-06-12T01:00:00.000Z",
  endpointPath: "/ingest",
  userAgent: "swamp-cli/test",
  event: {
    event: "cli_invocation",
    distinct_id: "user-1",
    properties: {
      invocation: { command: "model", optionKeys: ["--json"] },
      result: { status: "success", exitCode: 0 },
      $repo_id: "repo-1",
    },
  },
};

Deno.test("scan summarizes a populated event store into an audit resource", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${dir}/event.json`, JSON.stringify(sampleEvent));
    const { context, getWrittenResources, getLogsByLevel } =
      createModelTestContext({ globalArgs: { eventsDir: dir } });

    const result = await model.methods.scan.execute(
      {},
      context as unknown as Parameters<typeof model.methods.scan.execute>[1],
    );

    assertEquals(result.dataHandles.length, 1);
    const written = getWrittenResources();
    assertEquals(written.length, 1);
    assertEquals(written[0].specName, "audit");
    assertEquals(written[0].name, "current");
    const data = written[0].data as {
      eventCount: number;
      commands: Record<string, number>;
    };
    assertEquals(data.eventCount, 1);
    assertEquals(data.commands, { model: 1 });
    // entry + exit info logs
    assertEquals(getLogsByLevel("info").length, 2);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("scan produces a valid empty audit when the store is missing", async () => {
  const { context, getWrittenResources } = createModelTestContext({
    globalArgs: { eventsDir: "/tmp/swamp-telemetry-audit-missing-store" },
  });

  const result = await model.methods.scan.execute(
    {},
    context as unknown as Parameters<typeof model.methods.scan.execute>[1],
  );

  assertEquals(result.dataHandles.length, 1);
  const data = getWrittenResources()[0].data as { eventCount: number };
  assertEquals(data.eventCount, 0);
});
