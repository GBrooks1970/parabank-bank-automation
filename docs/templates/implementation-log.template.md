<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: DOCS/implementation-logs/YYYY-MM-DD_[topic].md
  TEMPLATE: DOCS/templates/implementation-log.template.md
-->

# [REQUIRED: Topic / Feature / Refactor Title] — [REQUIRED: YYYY-MM-DD]

## Session Summary

[REQUIRED: 2–4 sentences. What was the goal? What was achieved? What is the resulting state?]

---

## Objectives

[REQUIRED: Numbered list of what this session set out to do. Mark each as complete or deferred.]

1. ✅ / ❌ / ⏸️ [Objective 1]
2. ✅ / ❌ / ⏸️ [Objective 2]
3. [Add as needed]

---

## Test Results

[REQUIRED if tests were run: Before/after comparison. Omit section if no tests were executed.]

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| [STACK_NAME] | [Util / API] | [N/N] | [N/N] | ✅ PASS / ❌ FAIL |

---

## Changes Implemented

[REQUIRED: One subsection per logical change. Include file paths and brief code context where non-obvious.]

### [REQUIRED: Change 1 — descriptive title]

**Files changed:**
- `[path/to/file.ext]` — [what changed and why]

[OPTIONAL: code snippet or before/after if the change is subtle]

### [REQUIRED: Change 2 — descriptive title]

[Repeat as needed]

---

## Technical Decisions

[REQUIRED: List decisions made during this session that are not already in DECISION_REGISTER.md.
 If a decision here is structural or process-level, create a DR-NNN entry in DECISION_REGISTER.md.]

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| [decision] | [why] | [what was considered] |

---

## Documentation Updates

[REQUIRED: List every documentation file modified as a direct result of this session.]

- `[path/to/doc.md]` — [what was updated]

---

## Lessons Learned

[REQUIRED: Key takeaways. What would you do differently? What surprised you? What is a reusable pattern?]

- [lesson 1]
- [lesson 2]

---

## Recommendations / Next Steps

[REQUIRED: What should happen next? Link to BACKLOG.md items or create new ones.]

- [ ] [action 1] — [owner / priority]
- [ ] [action 2]

---

*Session logged: [REQUIRED: YYYY-MM-DD]. Author: [REQUIRED: name or agent identifier].*
