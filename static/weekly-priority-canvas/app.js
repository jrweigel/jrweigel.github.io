const STORAGE_KEY = "weekly-priority-canvas-v2";
const PREFS_KEY = "weekly-priority-canvas-prefs-v1";
const COPILOT_URL = "https://m365.cloud.microsoft/chat";

const PROMPT_BY_MODE = {
  impact_effort: `Review my recent emails, meetings, chats, and documents from the last 7 days.
Generate my top 12 priority tasks for this week, considering impact and effort.

Output requirements:
- Return plain text only
- Return tasks separated by commas or semicolons on a single line (or multiple lines, all separated by commas/semicolons)
- No numbering
- No bullets
- No headers
- No markdown
- No explanations
- Each task must start with a strong action verb
- Keep each task under 90 characters

Return ONLY the 12 tasks separated by commas or semicolons, with no extra text before or after.`,
  frequency_time: `Review my recent emails, meetings, chats, and documents from the last 7 days.
Generate my top 12 priority tasks for this week, considering frequency and time cost.

Output requirements:
- Return plain text only
- Return tasks separated by commas or semicolons on a single line (or multiple lines, all separated by commas/semicolons)
- No numbering
- No bullets
- No headers
- No markdown
- No explanations
- Each task must start with a strong action verb
- Keep each task under 90 characters

Return ONLY the 12 tasks separated by commas or semicolons, with no extra text before or after.`,
  importance_urgency: `Review my recent emails, meetings, chats, and documents from the last 7 days.
Generate my top 12 priority tasks for this week, considering importance and urgency.

Output requirements:
- Return plain text only
- Return tasks separated by commas or semicolons on a single line (or multiple lines, all separated by commas/semicolons)
- No numbering
- No bullets
- No headers
- No markdown
- No explanations
- Each task must start with a strong action verb
- Keep each task under 90 characters

Return ONLY the 12 tasks separated by commas or semicolons, with no extra text before or after.`,
  value_risk: `Review my recent emails, meetings, chats, and documents from the last 7 days.
Generate my top 12 priority tasks for this week, considering value and risk.

Output requirements:
- Return plain text only
- Return tasks separated by commas or semicolons on a single line (or multiple lines, all separated by commas/semicolons)
- No numbering
- No bullets
- No headers
- No markdown
- No explanations
- Each task must start with a strong action verb
- Keep each task under 90 characters

Return ONLY the 12 tasks separated by commas or semicolons, with no extra text before or after.`,
  energy_joy: `Review my recent emails, meetings, chats, and documents from the last 7 days.
Generate my top 12 priority tasks for this week, considering your energy and what brings you joy.

Output requirements:
- Return plain text only
- Return tasks separated by commas or semicolons on a single line (or multiple lines, all separated by commas/semicolons)
- No numbering
- No bullets
- No headers
- No markdown
- No explanations
- Each task must start with a strong action verb
- Keep each task under 90 characters

Return ONLY the 12 tasks separated by commas or semicolons, with no extra text before or after.`
};

function generateCopilotPrompt(modeKey) {
  return PROMPT_BY_MODE[modeKey] || PROMPT_BY_MODE.impact_effort;
}

const QUADRANTS = {
  quick_wins: { label: "Quick Wins", impact: "high", effort: "low" },
  big_bets: { label: "Big Bets", impact: "high", effort: "high" },
  fill_ins: { label: "Fill-Ins", impact: "low", effort: "low" },
  money_pits: { label: "Money Pits", impact: "low", effort: "high" }
};

const AXIS_MODES = {
  impact_effort: {
    title: "Impact x Effort board",
    yLabel: "Impact (Low to High)",
    xLabel: "Effort (Low to High)",
    quadrants: {
      quick_wins: { label: "Quick Wins", hint: "High impact, low effort" },
      big_bets: { label: "Big Bets", hint: "High impact, high effort" },
      fill_ins: { label: "Fill-Ins", hint: "Low impact, low effort" },
      money_pits: { label: "Money Pits", hint: "Low impact, high effort" }
    }
  },
  frequency_time: {
    title: "Frequency x Time Cost board",
    yLabel: "Frequency (Low to High)",
    xLabel: "Time Cost (Low to High)",
    quadrants: {
      quick_wins: { label: "Frequent Fast Tasks", hint: "Frequent, low time cost" },
      big_bets: { label: "Frequent Time Drains", hint: "Frequent, high time cost" },
      fill_ins: { label: "Occasional Quick Tasks", hint: "Occasional, low time cost" },
      money_pits: { label: "Rare Time Sinks", hint: "Occasional, high time cost" }
    }
  },
  importance_urgency: {
    title: "Importance x Urgency board",
    yLabel: "Importance (Low to High)",
    xLabel: "Urgency (Low to High)",
    quadrants: {
      quick_wins: { label: "Strategic Work", hint: "High importance, low urgency" },
      big_bets: { label: "Firefighting", hint: "High importance, high urgency" },
      fill_ins: { label: "Background Tasks", hint: "Low importance, low urgency" },
      money_pits: { label: "Interruptions", hint: "Low importance, high urgency" }
    }
  },
  value_risk: {
    title: "Value x Risk board",
    yLabel: "Value (Low to High)",
    xLabel: "Risk (Low to High)",
    quadrants: {
      quick_wins: { label: "Safe Wins", hint: "High value, low risk" },
      big_bets: { label: "High-Stakes Bets", hint: "High value, high risk" },
      fill_ins: { label: "Low Stakes", hint: "Low value, low risk" },
      money_pits: { label: "Risky Low Return", hint: "Low value, high risk" }
    }
  },
  energy_joy: {
    title: "Energy x Joy board",
    yLabel: "Energy (Low to High)",
    xLabel: "Joy (Low to High)",
    quadrants: {
      quick_wins: { label: "Effortful Chores", hint: "High energy, low joy" },
      big_bets: { label: "Flow Work", hint: "High energy, high joy" },
      fill_ins: { label: "Avoid If Possible", hint: "Low energy, low joy" },
      money_pits: { label: "Easy Delights", hint: "Low energy, high joy" }
    }
  }
};

const DEFAULT_STATE = {
  cards: []
};

const DEFAULT_PREFS = {
  axisMode: "impact_effort"
};

let state = loadState();
let prefs = loadPrefs();

const els = {
  taskInput: document.getElementById("taskInput"),
  importBtn: document.getElementById("importBtn"),
  addCardBtn: document.getElementById("addCardBtn"),
  axisModeSelect: document.getElementById("axisModeSelect"),
  boardWrapper: document.getElementById("boardWrapper"),
  axisYLabel: document.getElementById("axisYLabel"),
  axisXLabel: document.getElementById("axisXLabel"),
  openCopilotBtn: document.getElementById("openCopilotBtn"),
  clearActiveBtn: document.getElementById("clearActiveBtn"),
  fullResetBtn: document.getElementById("fullResetBtn"),
  clearCompletedBtn: document.getElementById("clearCompletedBtn"),
  statusLine: document.getElementById("statusLine"),
  completedList: document.getElementById("completedList"),
  completedCount: document.getElementById("completedCount"),
  cardTemplate: document.getElementById("cardTemplate"),
  completedTemplate: document.getElementById("completedTemplate")
};

boot();

function boot() {
  applyAxisMode();
  bindEvents();
  render();
  setStatus("Ready for this week.");
}

function bindEvents() {
  els.importBtn.addEventListener("click", onImport);
  els.addCardBtn.addEventListener("click", onAddSingleCard);
  els.axisModeSelect.addEventListener("change", onAxisModeChange);
  els.openCopilotBtn.addEventListener("click", onOpenCopilot);
  els.clearActiveBtn.addEventListener("click", onClearActiveBoard);
  els.fullResetBtn.addEventListener("click", onFullReset);
  els.clearCompletedBtn.addEventListener("click", onClearCompleted);

  document.querySelectorAll(".quadrant").forEach((quadrantEl) => {
    quadrantEl.addEventListener("dragover", onDragOverQuadrant);
    quadrantEl.addEventListener("dragleave", onDragLeaveQuadrant);
    quadrantEl.addEventListener("drop", onDropCard);
  });
}

function onAxisModeChange(event) {
  const nextMode = event.target.value;
  if (!AXIS_MODES[nextMode]) {
    return;
  }
  prefs.axisMode = nextMode;
  persistPrefs();
  applyAxisMode();
}

function applyAxisMode() {
  const mode = AXIS_MODES[prefs.axisMode] || AXIS_MODES.impact_effort;
  els.axisModeSelect.value = prefs.axisMode;
  els.boardWrapper.setAttribute("aria-label", mode.title);
  els.axisYLabel.textContent = mode.yLabel;
  els.axisXLabel.textContent = mode.xLabel;

  Object.keys(mode.quadrants).forEach((key) => {
    const q = mode.quadrants[key];
    const labelNode = document.getElementById(`label-${key}`);
    const hintNode = document.getElementById(`hint-${key}`);
    const section = document.querySelector(`.quadrant[data-quadrant='${key}']`);
    if (labelNode) {
      labelNode.textContent = q.label;
    }
    if (hintNode) {
      hintNode.textContent = q.hint;
    }
    if (section) {
      section.setAttribute("aria-label", q.label);
    }
  });
}

function onImport() {
  const lines = parseTaskLines(els.taskInput.value);
  if (!lines.length) {
    setStatus("No tasks found. Add tasks separated by commas, semicolons, or line breaks.");
    return;
  }

  const additions = addTasks(lines);
  if (!additions.length) {
    setStatus("All pasted items already exist on the board or in completed.");
    return;
  }

  els.taskInput.value = "";
  setStatus(`Added ${additions.length} new card(s). Drag cards to override placement.`);
}

function onAddSingleCard() {
  const value = window.prompt("Add a new card:");
  if (!value) {
    return;
  }

  const additions = addTasks([value]);
  if (!additions.length) {
    setStatus("That card already exists.");
    return;
  }

  els.taskInput.value = "";
  setStatus("Card added.");
}

async function onOpenCopilot() {
  const prompt = generateCopilotPrompt(prefs.axisMode);
  let copied = false;
  try {
    await navigator.clipboard.writeText(prompt);
    copied = true;
  } catch (_error) {
    copied = false;
  }

  window.open(COPILOT_URL, "_blank", "noopener,noreferrer");
  if (copied) {
    setStatus("Prompt copied. Paste in M365 Copilot, modify context as needed based on what you want to plot, copy results into box above, and click Merge Into Board.");
    return;
  }

  window.prompt("Clipboard blocked. Select all and copy this prompt to paste into M365 Copilot:", prompt);
  setStatus("M365 Copilot opened. Copy the prompt from the dialog and paste it in.");
}

function addTasks(lines) {
  const trimmed = lines.map((line) => String(line).trim()).filter(Boolean);
  const existingNormalized = new Set(state.cards.map((card) => normalizeText(card.text)));

  const freshLines = trimmed.filter((line) => !existingNormalized.has(normalizeText(line)));
  if (!freshLines.length) {
    return [];
  }

  const now = Date.now();
  const additions = freshLines.map((text) => {
    const placement = heuristicPlacement(text);
    return {
      id: uuid(),
      text,
      quadrant: placement.quadrant,
      status: "active",
      createdAt: now,
      updatedAt: now,
      placement: {
        source: placement.source,
        reason: placement.reason || "",
        confidence: placement.confidence ?? null
      }
    };
  });

  state.cards.push(...additions);
  persist();
  render();
  return additions;
}

function onClearActiveBoard() {
  const activeCount = state.cards.filter((card) => card.status === "active").length;
  if (!activeCount) {
    setStatus("No active cards to clear.");
    return;
  }
  if (!window.confirm(`Clear ${activeCount} active card(s)? Completed cards will stay.`)) {
    return;
  }

  state.cards = state.cards.filter((card) => card.status !== "active");
  persist();
  render();
  setStatus("Active board cleared. Completed cards were kept.");
}

function onFullReset() {
  if (!window.confirm("Full reset will remove active cards, completed cards, and board data. Continue?")) {
    return;
  }

  state = structuredClone(DEFAULT_STATE);
  persist();
  render();
  setStatus("Board fully reset.");
}

function onClearCompleted() {
  const completedCount = state.cards.filter((card) => card.status === "completed").length;
  if (!completedCount) {
    setStatus("No completed cards to clear.");
    return;
  }
  if (!window.confirm(`Delete ${completedCount} completed card(s)?`)) {
    return;
  }

  state.cards = state.cards.filter((card) => card.status !== "completed");
  persist();
  render();
  setStatus("Completed cards deleted.");
}

function parseTaskLines(raw) {
  // Split by newlines, commas, or semicolons
  return raw
    .split(/[,;\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function heuristicPlacement(text) {
  const t = text.toLowerCase();

  const highImpactHints = [
    "launch", "revenue", "customer", "roadmap", "strategy", "partner", "hire", "qbr", "security", "incident", "renewal", "pricing", "proposal", "deal", "board", "exec"
  ];
  const lowImpactHints = [
    "admin", "expense", "inbox", "email", "tidy", "cleanup", "ops check", "calendar", "follow up", "format"
  ];
  const highEffortHints = [
    "build", "rebuild", "refactor", "migrate", "rewrite", "design", "investigate", "research", "plan", "architecture", "deep dive", "implementation"
  ];
  const lowEffortHints = [
    "review", "reply", "approve", "sync", "call", "quick", "send", "book", "schedule", "check", "update"
  ];

  let impact = 0;
  let effort = 0;

  highImpactHints.forEach((hint) => {
    if (t.includes(hint)) {
      impact += 2;
    }
  });
  lowImpactHints.forEach((hint) => {
    if (t.includes(hint)) {
      impact -= 2;
    }
  });
  highEffortHints.forEach((hint) => {
    if (t.includes(hint)) {
      effort += 2;
    }
  });
  lowEffortHints.forEach((hint) => {
    if (t.includes(hint)) {
      effort -= 2;
    }
  });

  if (text.length > 70) {
    effort += 1;
  }
  if (/(today|asap|urgent|blocker|deadline|this week)/.test(t)) {
    impact += 1;
  }

  const impactHigh = impact >= 1;
  const effortHigh = effort >= 1;

  let quadrant = "quick_wins";
  if (impactHigh && effortHigh) {
    quadrant = "big_bets";
  } else if (!impactHigh && !effortHigh) {
    quadrant = "fill_ins";
  } else if (!impactHigh && effortHigh) {
    quadrant = "money_pits";
  }

  const confidence = Math.min(1, 0.45 + Math.abs(impact) * 0.08 + Math.abs(effort) * 0.08);
  return {
    quadrant,
    confidence,
    reason: `heuristic impact=${impact}, effort=${effort}`,
    source: "heuristic"
  };
}

function onDragOverQuadrant(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-target");
}

function onDragLeaveQuadrant(event) {
  event.currentTarget.classList.remove("drag-target");
}

function onDropCard(event) {
  event.preventDefault();
  const dropZone = event.currentTarget;
  dropZone.classList.remove("drag-target");

  const cardId = event.dataTransfer.getData("text/plain");
  const targetQuadrant = dropZone.dataset.quadrant;
  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card || card.status !== "active") {
    return;
  }

  if (card.quadrant === targetQuadrant) {
    return;
  }

  card.quadrant = targetQuadrant;
  card.updatedAt = Date.now();
  card.placement = {
    source: "manual",
    reason: "drag override",
    confidence: null
  };

  persist();
  render();
  setStatus("Card moved.");
}

function render() {
  renderActiveCards();
  renderCompletedCards();
  renderCounts();
}

function renderActiveCards() {
  Object.keys(QUADRANTS).forEach((key) => {
    const lane = document.getElementById(`lane-${key}`);
    lane.innerHTML = "";

    state.cards
      .filter((card) => card.status === "active" && card.quadrant === key)
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((card) => {
        lane.appendChild(buildCardNode(card));
      });
  });
}

function renderCompletedCards() {
  els.completedList.innerHTML = "";
  state.cards
    .filter((card) => card.status === "completed")
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((card) => {
      els.completedList.appendChild(buildCompletedNode(card));
    });
}

function renderCounts() {
  Object.keys(QUADRANTS).forEach((key) => {
    const count = state.cards.filter((card) => card.status === "active" && card.quadrant === key).length;
    document.getElementById(`count-${key}`).textContent = String(count);
  });

  const completedCount = state.cards.filter((card) => card.status === "completed").length;
  els.completedCount.textContent = String(completedCount);
}

function buildCardNode(card) {
  const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.cardId = card.id;
  node.querySelector(".card-text").textContent = card.text;

  node.addEventListener("dragstart", (event) => {
    node.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.id);
  });

  node.addEventListener("dragend", () => {
    node.classList.remove("dragging");
  });

  node.querySelector('[data-action="complete"]').addEventListener("click", () => {
    card.status = "completed";
    card.updatedAt = Date.now();
    persist();
    render();
    setStatus("Card marked complete.");
  });

  node.querySelector('[data-action="edit"]').addEventListener("click", () => {
    const next = window.prompt("Edit card", card.text);
    if (!next) {
      return;
    }
    const trimmed = next.trim();
    if (!trimmed) {
      return;
    }
    card.text = trimmed;
    card.updatedAt = Date.now();
    persist();
    render();
    setStatus("Card updated.");
  });

  node.querySelector('[data-action="delete"]').addEventListener("click", () => {
    if (!window.confirm("Delete this card?")) {
      return;
    }
    state.cards = state.cards.filter((entry) => entry.id !== card.id);
    persist();
    render();
    setStatus("Card deleted.");
  });

  return node;
}

function buildCompletedNode(card) {
  const node = els.completedTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.cardId = card.id;
  node.querySelector(".card-text").textContent = card.text;

  node.querySelector('[data-action="restore"]').addEventListener("click", () => {
    card.status = "active";
    card.updatedAt = Date.now();
    persist();
    render();
    setStatus("Card restored to board.");
  });

  node.querySelector('[data-action="delete"]').addEventListener("click", () => {
    if (!window.confirm("Delete this completed card?")) {
      return;
    }
    state.cards = state.cards.filter((entry) => entry.id !== card.id);
    persist();
    render();
    setStatus("Completed card deleted.");
  });

  return node;
}

function setStatus(message) {
  els.statusLine.textContent = message;
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  // RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(DEFAULT_STATE);
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("bad state shape");
    }

    const cards = Array.isArray(parsed.cards) ? parsed.cards : [];

    return {
      cards: cards
        .filter((card) => card && typeof card === "object" && typeof card.text === "string")
        .map((card) => ({
          id: typeof card.id === "string" ? card.id : uuid(),
          text: card.text,
          quadrant: QUADRANTS[card.quadrant] ? card.quadrant : "quick_wins",
          status: card.status === "completed" ? "completed" : "active",
          createdAt: Number(card.createdAt) || Date.now(),
          updatedAt: Number(card.updatedAt) || Date.now(),
          placement: card.placement && typeof card.placement === "object"
            ? {
                source: typeof card.placement.source === "string" ? card.placement.source : "heuristic",
                reason: typeof card.placement.reason === "string" ? card.placement.reason : "",
                confidence: toConfidence(card.placement.confidence)
              }
            : {
                source: "heuristic",
                reason: "",
                confidence: null
              }
        }))
    };
  } catch (error) {
    console.error("Could not load stored board, using defaults.", error);
    return structuredClone(DEFAULT_STATE);
  }
}

function toConfidence(value) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return null;
  }
  if (n < 0) {
    return 0;
  }
  if (n > 1) {
    return 1;
  }
  return n;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (e.g. private browsing, quota exceeded) — keep in-memory state
  }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFS };
    }
    const parsed = JSON.parse(raw);
    const axisMode = AXIS_MODES[parsed.axisMode] ? parsed.axisMode : "impact_effort";
    return { axisMode };
  } catch (error) {
    return { ...DEFAULT_PREFS };
  }
}

function persistPrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable — keep in-memory prefs
  }
}
