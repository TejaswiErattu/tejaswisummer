// ============================================================================
// OPERATION SCHEMA + VALIDATOR
//
// The model never writes code and never writes app state. Its only output is a
// list of operations drawn from the fixed schema below. Everything here is pure
// data-in / data-out: no DOM, no network, no app globals. The adapter is what
// actually mutates anything.
// ============================================================================

export const MAX_INSTANCES_PER_BATCH = 200;
export const MAX_QUESTIONS = 4;

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// --- Field contracts --------------------------------------------------------
// required: must be present and non-empty. optional: validated only if present.
export const OPERATION_SCHEMA = {
  add_task: {
    required: ["title", "category", "date"],
    optional: ["estimatedMinutes", "notes", "track"],
    label: "Add task"
  },
  add_recurring_task: {
    required: ["title", "category", "startDate", "endDate", "recurrence"],
    optional: ["estimatedMinutes", "notes", "track"],
    label: "Add recurring task"
  },
  add_milestone: {
    required: ["title", "category", "date"],
    optional: ["notes"],
    label: "Add milestone"
  },
  update_task: {
    required: ["taskId", "changes"],
    optional: [],
    label: "Update task"
  },
  move_task: {
    required: ["taskId", "newDate"],
    optional: [],
    label: "Move task"
  },
  delete_task: {
    required: ["taskId"],
    optional: [],
    label: "Delete task"
  },
  delete_recurring_series: {
    required: ["seriesId", "scope"],
    optional: ["fromDate"],
    label: "Delete recurring series"
  },
  set_completion: {
    required: ["taskId", "completed"],
    optional: [],
    label: "Set completion"
  },
  add_category: {
    required: ["key", "displayName"],
    optional: ["color"],
    label: "Add category"
  },
  add_project: {
    required: ["name", "targetDate"],
    optional: ["subtasks"],
    label: "Add project"
  },
  add_subsection: {
    required: ["key", "title"],
    optional: ["dateRangeLabel"],
    label: "Add subsection"
  }
};

export const OPERATION_NAMES = Object.keys(OPERATION_SCHEMA);

// Fields whose value is a calendar date and must parse as one.
const DATE_FIELDS = ["date", "startDate", "endDate", "newDate", "fromDate", "targetDate"];

// --- Date helpers (UTC-free, string-first, to dodge timezone drift) ----------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  // Rejects things like 2026-02-30 that Date would silently roll forward.
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseDateStr(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateStr(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function addDays(dateStr, n) {
  const dt = parseDateStr(dateStr);
  dt.setDate(dt.getDate() + n);
  return formatDateStr(dt);
}

// --- Recurrence expansion ---------------------------------------------------
// Returns { dates: [...], error: string|null }. Capped so a runaway recurrence
// can never balloon the batch; the caller enforces MAX_INSTANCES_PER_BATCH.
export function expandRecurrence(op, hardCap = MAX_INSTANCES_PER_BATCH + 1) {
  // `truncated` tells the caller the real count is larger than what we return,
  // so it can say "more than N" rather than quoting the cap as an exact figure.
  const { startDate, endDate, recurrence } = op;
  if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) {
    return { dates: [], error: "startDate/endDate must be valid YYYY-MM-DD dates" };
  }
  if (endDate < startDate) {
    return { dates: [], error: "endDate is before startDate" };
  }
  if (!recurrence || typeof recurrence !== "object") {
    return { dates: [], error: "recurrence is missing" };
  }

  const type = recurrence.type;
  const dates = [];

  if (type === "daily") {
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      dates.push(d);
      if (dates.length > hardCap) return { dates, error: null, truncated: true };
    }
  } else if (type === "weekly") {
    const days = Array.isArray(recurrence.daysOfWeek) ? recurrence.daysOfWeek : [];
    if (days.length === 0) {
      return { dates: [], error: 'recurrence.type "weekly" requires a non-empty daysOfWeek array' };
    }
    const bad = days.filter(d => !DAY_KEYS.includes(String(d).toLowerCase()));
    if (bad.length) {
      return { dates: [], error: `unknown day name(s): ${bad.join(", ")} (use ${DAY_KEYS.join("/")})` };
    }
    const wanted = new Set(days.map(d => DAY_KEYS.indexOf(String(d).toLowerCase())));
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      if (wanted.has(parseDateStr(d).getDay())) dates.push(d);
      if (dates.length > hardCap) return { dates, error: null, truncated: true };
    }
  } else if (type === "interval") {
    const n = Number(recurrence.everyNDays);
    if (!Number.isInteger(n) || n < 1) {
      return { dates: [], error: 'recurrence.type "interval" requires everyNDays as a positive integer' };
    }
    for (let d = startDate; d <= endDate; d = addDays(d, n)) {
      dates.push(d);
      if (dates.length > hardCap) return { dates, error: null, truncated: true };
    }
  } else {
    return { dates: [], error: `unknown recurrence.type "${type}" (use daily/weekly/interval)` };
  }

  return { dates, error: null, truncated: false };
}

// --- Validation -------------------------------------------------------------
// ctx: {
//   categoryKeys: Set<string>,     existing category keys
//   taskIds: Set<string>,          every task id currently in state
//   seriesIds: Set<string>,        every recurring series id currently in state
//   completedTaskIds: Set<string>, subset of taskIds that are done
//   today: "YYYY-MM-DD",
//   pendingCategoryKeys: Set<string>  categories created earlier in this batch
// }

function err(index, op, message) {
  return { index, op: op && op.op, message };
}

export function validateOperation(op, ctx, index = 0) {
  const errors = [];
  const push = (m) => errors.push(err(index, op, m));

  if (!op || typeof op !== "object" || Array.isArray(op)) {
    push("operation is not an object");
    return errors;
  }
  const schema = OPERATION_SCHEMA[op.op];
  if (!schema) {
    push(`unknown operation "${op.op}" (allowed: ${OPERATION_NAMES.join(", ")})`);
    return errors;
  }

  // Every operation must explain itself.
  if (typeof op.reason !== "string" || !op.reason.trim()) {
    push('missing "reason" (a one-sentence plain-English explanation)');
  }

  // Required fields present and non-empty.
  for (const f of schema.required) {
    const v = op[f];
    const empty = v === undefined || v === null || v === "" ||
                  (Array.isArray(v) && v.length === 0);
    // `completed: false` is a legitimate value, so booleans are never "empty".
    if (empty && typeof v !== "boolean") push(`missing required field "${f}"`);
  }

  // No stray fields - keeps the model from smuggling in anything we don't apply.
  const allowed = new Set([...schema.required, ...schema.optional, "op", "reason"]);
  for (const k of Object.keys(op)) {
    if (!allowed.has(k)) push(`unexpected field "${k}" for ${op.op}`);
  }

  // Dates parse and are real calendar dates.
  for (const f of DATE_FIELDS) {
    if (op[f] !== undefined && op[f] !== null && !isValidDateStr(op[f])) {
      push(`"${f}" must be a real calendar date as YYYY-MM-DD (got ${JSON.stringify(op[f])})`);
    }
  }

  const categoryExists = (key) =>
    ctx.categoryKeys.has(key) || ctx.pendingCategoryKeys.has(key);

  // Per-operation rules.
  switch (op.op) {
    case "add_task":
    case "add_milestone":
      if (op.category && !categoryExists(op.category)) {
        push(`category "${op.category}" does not exist and is not created in this batch`);
      }
      if (op.estimatedMinutes !== undefined) {
        const m = Number(op.estimatedMinutes);
        if (!Number.isFinite(m) || m <= 0 || m > 24 * 60) {
          push(`estimatedMinutes must be between 1 and 1440 (got ${op.estimatedMinutes})`);
        }
      }
      break;

    case "add_recurring_task": {
      if (op.category && !categoryExists(op.category)) {
        push(`category "${op.category}" does not exist and is not created in this batch`);
      }
      if (op.estimatedMinutes !== undefined) {
        const m = Number(op.estimatedMinutes);
        if (!Number.isFinite(m) || m <= 0 || m > 24 * 60) {
          push(`estimatedMinutes must be between 1 and 1440 (got ${op.estimatedMinutes})`);
        }
      }
      const { dates, error } = expandRecurrence(op);
      if (error) push(error);
      else if (dates.length === 0) push("this recurrence produces no dates in the given range");
      break;
    }

    case "update_task":
      if (op.taskId && !ctx.taskIds.has(op.taskId)) {
        push(`taskId "${op.taskId}" does not exist`);
      }
      if (op.changes && typeof op.changes === "object" && !Array.isArray(op.changes)) {
        const allowedChanges = ["title", "category", "date", "estimatedMinutes", "notes", "track"];
        const keys = Object.keys(op.changes);
        if (keys.length === 0) push("changes is empty - nothing to update");
        for (const k of keys) {
          if (!allowedChanges.includes(k)) push(`changes."${k}" is not an updatable field`);
        }
        if (op.changes.category && !categoryExists(op.changes.category)) {
          push(`changes.category "${op.changes.category}" does not exist`);
        }
        if (op.changes.date !== undefined && !isValidDateStr(op.changes.date)) {
          push(`changes.date must be a real calendar date as YYYY-MM-DD`);
        }
      } else if (op.changes !== undefined) {
        push("changes must be an object");
      }
      break;

    case "move_task":
      if (op.taskId && !ctx.taskIds.has(op.taskId)) {
        push(`taskId "${op.taskId}" does not exist`);
      }
      break;

    case "delete_task":
    case "set_completion":
      if (op.taskId && !ctx.taskIds.has(op.taskId)) {
        push(`taskId "${op.taskId}" does not exist`);
      }
      if (op.op === "set_completion" && typeof op.completed !== "boolean") {
        push('"completed" must be true or false');
      }
      break;

    case "delete_recurring_series":
      if (op.seriesId && !ctx.seriesIds.has(op.seriesId)) {
        push(`seriesId "${op.seriesId}" does not exist`);
      }
      if (!["all", "future_only"].includes(op.scope)) {
        push('scope must be "all" or "future_only"');
      }
      if (op.scope === "future_only" && !op.fromDate) {
        push('scope "future_only" requires fromDate');
      }
      break;

    case "add_category":
      if (typeof op.key !== "string" || !/^[a-z][a-z0-9_]{1,30}$/.test(op.key || "")) {
        push('key must be lowercase letters/digits/underscores, 2-31 chars (e.g. "pentesting")');
      }
      if (ctx.categoryKeys.has(op.key)) {
        push(`category "${op.key}" already exists`);
      }
      if (op.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(op.color)) {
        push('color must be a 6-digit hex value like "#7fd8ff"');
      }
      break;

    case "add_project":
      if (op.subtasks !== undefined) {
        if (!Array.isArray(op.subtasks) || op.subtasks.some(s => typeof s !== "string" || !s.trim())) {
          push("subtasks must be an array of non-empty strings");
        }
      }
      break;

    case "add_subsection":
      if (typeof op.key !== "string" || !/^[a-z][a-z0-9_]{1,30}$/.test(op.key || "")) {
        push('key must be lowercase letters/digits/underscores, 2-31 chars');
      }
      break;
  }

  return errors;
}

// Validates the whole batch together, so categories created in op[0] are visible
// to op[1], and so batch-wide caps are enforced.
export function validateBatch(operations, baseCtx) {
  const errors = [];

  if (!Array.isArray(operations)) {
    return { ok: false, errors: [err(0, null, "operations must be an array")], instanceCount: 0 };
  }
  if (operations.length === 0) {
    return { ok: false, errors: [err(0, null, "the model returned an empty operation list")], instanceCount: 0 };
  }

  const ctx = { ...baseCtx, pendingCategoryKeys: new Set() };

  // Pre-pass: categories created in this batch count as existing for later ops.
  operations.forEach(op => {
    if (op && op.op === "add_category" && typeof op.key === "string") {
      ctx.pendingCategoryKeys.add(op.key);
    }
  });

  let instanceCount = 0;
  let truncated = false;
  operations.forEach((op, i) => {
    errors.push(...validateOperation(op, ctx, i));
    if (!op) return;
    if (op.op === "add_task" || op.op === "add_milestone") instanceCount += 1;
    if (op.op === "add_recurring_task") {
      const r = expandRecurrence(op);
      instanceCount += r.dates.length;
      if (r.truncated) truncated = true;
    }
  });

  // Hard cap on batch size, enforced here in code rather than trusted to the prompt.
  if (instanceCount > MAX_INSTANCES_PER_BATCH) {
    const howMany = truncated
      ? `more than ${MAX_INSTANCES_PER_BATCH}`
      : `${instanceCount}`;
    errors.push(err(0, null,
      `this batch would create ${howMany} task instances, over the limit of ${MAX_INSTANCES_PER_BATCH}. ` +
      `Narrow the date range or reduce how often it repeats.`));
  }

  return { ok: errors.length === 0, errors, instanceCount, truncated };
}

// --- Guardrail classification ----------------------------------------------
// Flags operations that touch completed tasks or the past. These do NOT fail
// validation; they require a separate, explicit confirmation checkbox in the
// preview before Apply is enabled.
export function findRiskyOperations(operations, ctx) {
  const risky = [];
  const isMutating = (o) =>
    ["update_task", "move_task", "delete_task", "set_completion"].includes(o.op);

  operations.forEach((op, index) => {
    if (!op || !isMutating(op)) return;
    const reasons = [];

    if (op.taskId && ctx.completedTaskIds.has(op.taskId)) {
      reasons.push("this task is already marked complete");
    }
    const onDate = ctx.taskDates ? ctx.taskDates.get(op.taskId) : null;
    if (onDate && onDate < ctx.today) {
      reasons.push(`this task is in the past (${onDate})`);
    }
    if (op.op === "move_task" && op.newDate && op.newDate < ctx.today) {
      reasons.push(`it would be moved into the past (${op.newDate})`);
    }
    if (reasons.length) risky.push({ index, op, reasons });
  });

  return risky;
}
