import assert from "node:assert/strict";
import test from "node:test";
import workflow from "../workflow-logic.js";

const validPlan = {
  schema: "move-the-work-plan",
  version: 1,
  activeTaskId: "weekly-status",
  planSummary: "Create a reliable weekly status workflow.",
  outcome: "A reviewed status update is ready every Friday.",
  weeklyCheckpoints: [
    "Inventory source material",
    "Draft the repeatable workflow",
    "Run and refine the workflow",
    "Complete the final trial"
  ],
  successSignal: "Four updates are delivered with less preparation time.",
  firstAction: "Collect the last three status updates.",
  nextReviewDate: "2026-09-17",
  reviewEventStatus: "unscheduled"
};

const validInventory = {
  tasks: [{
    id: "weekly-status",
    label: "Weekly status",
    description: "Prepare a weekly project update.",
    source: "graph-pre-seed",
    bucket: "unsorted",
    evidence: "Recurring Friday status thread.",
    frequency: 3,
    energyDrain: 4,
    ioClarity: 4
  }, {
    id: "meeting-prep",
    label: "Meeting prep",
    description: "Prepare context for recurring meetings.",
    source: "manual-paste",
    bucket: "unsorted",
    evidence: "Described by the user; please verify.",
    frequency: 4,
    energyDrain: 3,
    ioClarity: 3
  }]
};

test("buildInventoryPrompt is capability-aware, numbered, and JSON-specific", () => {
  const prompt = workflow.buildInventoryPrompt();
  assert.match(prompt, /context you can actually access/i);
  assert.match(prompt, /number candidates 1, 2, 3/i);
  assert.match(prompt, /switch from interview mode to JSON output mode/i);
  assert.match(prompt, /exactly one fenced JSON block and nothing else/i);
  assert.match(prompt, /JSON\.parse-compatible/);
  assert.match(prompt, /"tasks": \[/);
  assert.doesNotMatch(prompt, /Which AI tool|run it in M365|run it in WorkIQ/i);
});

test("parseInventoryEnvelope accepts fenced, prose-wrapped, and aliased task lists", () => {
  assert.equal(workflow.parseInventoryEnvelope(`\`\`\`json\n${JSON.stringify(validInventory)}\n\`\`\``).length, 2);
  assert.equal(workflow.parseInventoryEnvelope(`Result:\n${JSON.stringify(validInventory)}\nDone.`).length, 2);
  assert.equal(workflow.parseInventoryEnvelope(JSON.stringify({ responsibilities: validInventory.tasks })).length, 2);
  assert.equal(workflow.parseInventoryEnvelope(JSON.stringify({ inventory: validInventory.tasks })).length, 2);
});

test("parseInventoryEnvelope rejects malformed and truncated output", () => {
  assert.throws(() => workflow.parseInventoryEnvelope('{"tasks":[{"label":"Status"}'), /incomplete or truncated/i);
  assert.throws(() => workflow.parseInventoryEnvelope('{tasks: []}'), /couldn't find one complete JSON object/i);
  assert.throws(() => workflow.parseInventoryEnvelope('{"items":[]}'), /no task list/i);
});

test("buildActionPackPrompt stays capability-neutral and includes return contract", () => {
  const prompt = workflow.buildActionPackPrompt({
    activeTask: { id: "weekly-status", task: "Weekly status" },
    desiredResult: "A repeatable update",
    relevantInputs: "Prior updates",
    nonNegotiables: "Manager approval",
    horizon: "four weeks"
  });

  assert.match(prompt, /capabilities actually available in this host/i);
  assert.match(prompt, /move-the-work-plan/);
  assert.match(prompt, /explicit approval/i);
  assert.doesNotMatch(prompt, /Scout|Cowork|ChatGPT|Claude|Copilot/);
});

test("parsePlanReturn extracts a valid fenced plan", () => {
  const result = workflow.parsePlanReturn(
    `Here is the plan.\n\n\`\`\`json\n${JSON.stringify(validPlan)}\n\`\`\``,
    "weekly-status",
    new Date("2026-08-20T12:00:00Z")
  );

  assert.equal(result.outcome, validPlan.outcome);
  assert.equal(result.weeklyCheckpoints.length, 4);
  assert.equal(result.importedAt, "2026-08-20T12:00:00.000Z");
});

test("parsePlanReturn rejects mismatched tasks and incomplete checkpoints", () => {
  assert.throws(
    () => workflow.parsePlanReturn(JSON.stringify(validPlan), "meeting-prep"),
    /does not match the active task/i
  );
  assert.throws(
    () => workflow.parsePlanReturn(JSON.stringify({ ...validPlan, weeklyCheckpoints: ["Only one"] }), "weekly-status"),
    /exactly four weekly checkpoints/i
  );
});

test("normalizeFourWeekSprint preserves legacy fields and adds new defaults", () => {
  const result = workflow.normalizeFourWeekSprint({
    outcome: "Legacy outcome",
    weeklyCheckpoints: ["One", "Two"]
  }, "2026-09-17");

  assert.equal(result.outcome, "Legacy outcome");
  assert.deepEqual(result.weeklyCheckpoints, ["One", "Two", "", ""]);
  assert.equal(result.reviewEventStatus, "unscheduled");
});

test("isPlanOverdue requires a substantive plan and treats today as current", () => {
  const plan = { importedAt: "2026-07-01T00:00:00.000Z", nextReviewDate: "2026-08-20" };
  assert.equal(workflow.isPlanOverdue(plan, "2026-08-19"), false);
  assert.equal(workflow.isPlanOverdue(plan, "2026-08-20"), false);
  assert.equal(workflow.isPlanOverdue(plan, "2026-08-21"), true);
  assert.equal(workflow.isPlanOverdue({ ...plan, importedAt: null, outcome: "Legacy outcome" }, "2026-08-21"), true);
  assert.equal(workflow.isPlanOverdue({ importedAt: null, outcome: "", weeklyCheckpoints: [], nextReviewDate: "2026-08-20" }, "2026-08-21"), false);
});

test("buildReviewCalendar creates an all-day review without leaking raw inputs", () => {
  const calendar = workflow.buildReviewCalendar(validPlan, "Weekly status");
  assert.match(calendar, /DTSTART;VALUE=DATE:20260917/);
  assert.match(calendar, /DTEND;VALUE=DATE:20260918/);
  assert.match(calendar, /SUMMARY:Review Move the Work: Weekly status/);
  assert.doesNotMatch(calendar, /Prior updates|Manager approval/);
});
