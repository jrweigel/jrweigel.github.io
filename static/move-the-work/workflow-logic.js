(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoveTheWorkWorkflow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PLAN_SCHEMA = "move-the-work-plan";
  const PLAN_VERSION = 1;
  const REVIEW_STATUSES = new Set(["scheduled", "unscheduled"]);

  function buildInventoryPrompt() {
    const example = {
      tasks: [{
        id: "weekly-status-update",
        label: "Weekly status update",
        description: "Gather project signals and prepare the weekly update for stakeholders.",
        source: "graph-pre-seed",
        bucket: "unsorted",
        evidence: "Recurring Friday status thread and weekly project review meeting.",
        frequency: 3,
        energyDrain: 4,
        ioClarity: 4
      }]
    };

    return `You are helping me inventory the actual tasks I spend time on for the "Move the Work" three-bucket audit (Automate / Assist / Human).

Capability check — do this first:
Identify the work context you can actually access in this session, including connected email, calendar, messages, documents, attached files, and pasted material. Name only sources you have verified. If no usable context is available, say so plainly and ask me once to describe or paste recent work context before starting the three rounds. Never invent access, activity, or evidence.

Then conduct exactly three conversational rounds, one round at a time. Wait for my answer after each round. Do not combine or skip rounds. Do not generate the final importable task inventory before I answer round 3; the provisional evidence map in round 1 is required and is not the final inventory.

Round 1 — evidence-led work map:
Before asking me to identify my projects or responsibilities, inspect the available context and present a numbered provisional map of the projects, workstreams, and recurring responsibilities you see. Number candidates 1, 2, 3, and so on so I can respond by number. For each candidate, provide a short plain-language name, 1 or 2 concrete pieces of evidence, whether it appears current, recurring, or possibly stale, and your confidence in the inference. Then ask me to validate what is correct, add what is missing, and identify by number what should be merged, renamed, removed, or marked inactive. Do not ask me to create the initial list myself. Keep these numbers stable during the interview, but do not include them as a field in the final JSON.

Round 2 — friction hypotheses:
Using the validated work map, identify likely friction, repetition, handoffs, delays, deferred work, and work that keeps landing on me but may not belong to my role. Reference the numbered candidates, show the observations and supporting evidence first, then ask me to confirm, correct, or add context. Ask targeted follow-up questions only where the evidence is incomplete.

Round 3 — energy, judgment, and ownership:
Using the validated map, ask targeted questions about what drains disproportionate energy, where human judgment matters, and what I uniquely own or should remain accountable for. Reference candidate numbers where useful.

Do not ask me what should be automated, assisted, or kept human, and do not recommend or assign buckets during this interview. Classification happens later in the audit.

After I answer round 3, switch from interview mode to JSON output mode. Identify exactly 6 to 12 recurring tasks or responsibilities, never more than 12. Prioritize recent time investment, cluster related items, and include boring, low-prestige, deferred, and "somehow always my job" work. If fewer than 6 tasks have direct evidence, include reasonable role-based inferences and label their evidence "inferred from role; please verify".

For every task use exactly these fields:
- id: unique short kebab-case slug
- label: 2 to 6 word plain-language task name
- description: 1 or 2 complete sentences
- source: "graph-pre-seed" when connected work data supports the task; otherwise "manual-paste" when support comes only from attached, pasted, or user-provided context
- bucket: always "unsorted"
- evidence: required nonempty string with 1 or 2 concrete examples or a clearly labeled inference
- frequency: integer 1 to 5 (5 daily, 4 a few times per week, 3 weekly, 2 monthly, 1 less than monthly)
- energyDrain: integer 1 to 5 (1 easy, 5 depleted afterward)
- ioClarity: integer 1 to 5 (1 highly subjective, 5 crystal-clear inputs and outputs)

The final response must contain exactly one fenced JSON block and nothing else. Its top level must be one object with a "tasks" array. Use valid JSON with double-quoted keys and strings. Do not use comments, trailing commas, ellipses, markdown inside values, duplicate keys, abbreviated field names, or additional fields. Do not return the provisional candidate numbers. Every task must contain every field. Before responding, verify the entire block is complete and JSON.parse-compatible. If the block would be malformed, incomplete, or truncated, regenerate the complete block instead of emitting a partial result.

This one-task example shows structure only; your final output must contain 6 to 12 tasks:

\`\`\`json
${JSON.stringify(example, null, 2)}
\`\`\``;
  }

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  }

  function findBalancedObject(text) {
    const source = String(text || "").replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    for (let start = source.indexOf("{"); start >= 0; start = source.indexOf("{", start + 1)) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = start; index < source.length; index += 1) {
        const char = source[index];
        if (inString) {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') inString = false;
          continue;
        }
        if (char === '"') inString = true;
        else if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) return source.slice(start, index + 1);
        }
      }
    }
    return null;
  }

  function parseInventoryEnvelope(text) {
    const source = String(text || "").trim();
    if (!source) throw new Error("Paste empty.");
    let parsed = null;
    try { parsed = JSON.parse(source.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "")); } catch (_) { /* inspect wrapped output */ }
    const appearsTruncated = source.lastIndexOf("{") > source.lastIndexOf("}") || source.lastIndexOf("[") > source.lastIndexOf("]");
    if (!parsed && appearsTruncated) {
      throw new Error("That JSON appears incomplete or truncated. Copy the complete fenced JSON object and try again; no tasks were imported.");
    }
    if (!parsed) {
      const objectText = findBalancedObject(source);
      if (objectText) {
        try { parsed = JSON.parse(objectText); } catch (_) { /* report below */ }
      }
    }
    if (!parsed) {
      throw new Error("I couldn't find one complete JSON object containing tasks.");
    }
    if (Array.isArray(parsed)) return parsed;
    for (const key of ["tasks", "responsibilities", "inventory"]) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
    throw new Error("Found JSON but no task list inside it.");
  }

  function normalizeFourWeekSprint(value, fallbackReviewDate) {
    const sprint = value && typeof value === "object" ? value : {};
    const checkpoints = Array.isArray(sprint.weeklyCheckpoints)
      ? sprint.weeklyCheckpoints.slice(0, 4).map((item) => String(item || "").trim())
      : [];
    while (checkpoints.length < 4) checkpoints.push("");
    return {
      planSummary: String(sprint.planSummary || "").trim(),
      outcome: String(sprint.outcome || "").trim(),
      weeklyCheckpoints: checkpoints,
      successSignal: String(sprint.successSignal || "").trim(),
      firstAction: String(sprint.firstAction || "").trim(),
      nextReviewDate: isIsoDate(sprint.nextReviewDate) ? sprint.nextReviewDate : fallbackReviewDate,
      reviewEventStatus: REVIEW_STATUSES.has(sprint.reviewEventStatus) ? sprint.reviewEventStatus : "unscheduled",
      importedAt: sprint.importedAt || null
    };
  }

  function parsePlanReturn(text, expectedTaskId, now) {
    const objectText = findBalancedObject(text);
    if (!objectText) throw new Error("No complete JSON plan was found.");

    let parsed;
    try {
      parsed = JSON.parse(objectText);
    } catch (_) {
      throw new Error("The returned plan is not valid JSON.");
    }

    if (parsed.schema !== PLAN_SCHEMA || parsed.version !== PLAN_VERSION) {
      throw new Error(`Expected ${PLAN_SCHEMA} version ${PLAN_VERSION}.`);
    }
    if (!parsed.activeTaskId || parsed.activeTaskId !== expectedTaskId) {
      throw new Error("This plan does not match the active task.");
    }

    const required = ["planSummary", "outcome", "successSignal", "firstAction"];
    const missing = required.filter((field) => !String(parsed[field] || "").trim());
    if (missing.length) throw new Error(`The plan is missing: ${missing.join(", ")}.`);
    if (!Array.isArray(parsed.weeklyCheckpoints) || parsed.weeklyCheckpoints.length !== 4 || parsed.weeklyCheckpoints.some((item) => !String(item || "").trim())) {
      throw new Error("The plan must contain exactly four weekly checkpoints.");
    }
    if (!isIsoDate(parsed.nextReviewDate)) throw new Error("The plan needs a valid review date in YYYY-MM-DD format.");
    if (!REVIEW_STATUSES.has(parsed.reviewEventStatus)) throw new Error("Review event status must be scheduled or unscheduled.");

    return normalizeFourWeekSprint({ ...parsed, importedAt: (now || new Date()).toISOString() }, parsed.nextReviewDate);
  }

  function isPlanOverdue(plan, today) {
    const hasPlan = plan && (
      plan.importedAt ||
      String(plan.planSummary || "").trim() ||
      String(plan.outcome || "").trim() ||
      (Array.isArray(plan.weeklyCheckpoints) && plan.weeklyCheckpoints.some((item) => String(item || "").trim()))
    );
    if (!hasPlan || !isIsoDate(plan.nextReviewDate)) return false;
    const comparisonDate = typeof today === "string" ? today : localDateString(today || new Date());
    return plan.nextReviewDate < comparisonDate;
  }

  function escapeCalendarText(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  function calendarUidPart(value, fallback) {
    return String(value || fallback || "active-task").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "active-task";
  }

  function buildReviewCalendar(plan, taskName, taskId) {
    if (!plan || !isIsoDate(plan.nextReviewDate)) throw new Error("A valid review date is required.");
    const date = plan.nextReviewDate.replace(/-/g, "");
    const uidTask = calendarUidPart(taskId, taskName);
    const uidRun = plan.importedAt ? `-${calendarUidPart(plan.importedAt)}` : "";
    const nextDay = new Date(`${plan.nextReviewDate}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = localDateString(nextDay).replace(/-/g, "");
    const description = [
      plan.planSummary,
      `Outcome: ${plan.outcome}`,
      `Success evidence: ${plan.successSignal}`,
      "Bring your saved Move the Work session and reflect on what happened."
    ].filter(Boolean).join("\n\n");
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Move the Work//Review//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:move-the-work-${uidTask}${uidRun}-${date}@jrweigel.github.io`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${escapeCalendarText(`Review Move the Work: ${taskName || "active task"}`)}`,
      `DESCRIPTION:${escapeCalendarText(description)}`,
      "END:VEVENT",
      "END:VCALENDAR",
      ""
    ].join("\r\n");
  }

  function buildActionPackPrompt(payload) {
    const returnShape = {
      schema: PLAN_SCHEMA,
      version: PLAN_VERSION,
      activeTaskId: payload.activeTask.id,
      planSummary: "One concise paragraph",
      outcome: "The agreed result at the end of four weeks",
      weeklyCheckpoints: ["Week 1 deliverable", "Week 2 deliverable", "Week 3 deliverable", "Week 4 deliverable"],
      successSignal: "The evidence that will show the experiment worked",
      firstAction: "The first concrete action",
      nextReviewDate: "YYYY-MM-DD",
      reviewEventStatus: "unscheduled"
    };

    return `Help me turn this Move the Work action pack into one bounded four-week workstream. Adapt to the capabilities actually available in this host.\n\n${JSON.stringify(payload, null, 2)}\n\nFirst, discover and summarize the files, connectors, tools, and action permissions you can actually access. Do not claim access you have not verified, and do not make me repeat context already included above. Ask only targeted questions needed to resolve a consequential gap.\n\nPropose a lightweight four-week plan with one outcome, four weekly deliverables, success evidence, and a first concrete action. Explain why the approach fits, ask for my feedback, and iterate until we agree. Keep other tasks out of the active workstream. Pause for explicit approval before sending messages, changing shared files, scheduling meetings, publishing, or taking another consequential external action.\n\nAfter I approve the plan, schedule the review when you have verified calendar capability and my approval. Otherwise mark it unscheduled and give me a practical fallback.\n\nFinish with exactly one fenced JSON block matching this contract so I can bring the plan back into Move the Work. Emit no prose after the block.\n\n${JSON.stringify(returnShape, null, 2)}`;
  }

  return {
    PLAN_SCHEMA,
    PLAN_VERSION,
    buildActionPackPrompt,
    buildInventoryPrompt,
    buildReviewCalendar,
    findBalancedObject,
    isIsoDate,
    isPlanOverdue,
    normalizeFourWeekSprint,
    parseInventoryEnvelope,
    parsePlanReturn
  };
});
