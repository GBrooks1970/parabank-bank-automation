# Project Review: parabank-bank-automation

[<- Back to Index](../00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (CODEX GPT-5)

- **Architecture and pattern fidelity:** The project has a coherent split between
  Serenity/JS Screenplay for the UI lane and a compact hand-rolled Screenplay core for API work.
  Actor, Ability, Task, Question, page-target, and step-glue responsibilities are recognisable.
  The shared REST client is reused for UI cross-checks. Some UI steps still contain substantial
  assertion orchestration, so the "one line thick" glue claim is aspirational rather than exact.

- **Executable specifications:** The 18 scenarios are readable, tagged by lane and state
  behaviour, and trace directly to A1-A5/B1-B4. Stateful scenarios capture created identifiers.
  FR-B1 is materially narrower than its design contract, and the stated zero/minimum/exact amount
  boundaries are absent. The bill-pay UI step should either assert the generated payee or use more
  precise wording.

- **Runtime lifecycle and isolation:** Build, boot, seed, use, and teardown are documented and
  encoded in CI. `seedDatabase()` polls readiness with bounded attempts; `@mutates` scenarios
  reset before execution, and `@loan` also restores admin parameters afterwards. Serial execution
  is appropriate for the single datastore. Read-only scenarios intentionally skip reset, so their
  seed assumptions remain sensitive to execution order unless selected through the dedicated
  smoke-safety command.

- **Waits and stability:** UI tasks wait for visible result regions and for asynchronously
  populated option elements; no fixed sleeps appear in the TypeScript suite. The remaining
  stability gap is that ordinary REST, SOAP, and OpenAPI fetches are not abortable at a
  request-level deadline. Current `main` CI is green for the exact reviewed commit.

- **Data, authentication, and API assumptions:** Public `john/demo` seed credentials and
  generated customer data are appropriate for the local demo SUT. Money outcomes use captured
  IDs and REST reads rather than UI text alone. The API layer correctly preserves observed
  query-parameter mutations and plain-text responses. No production secrets or external tokens
  are required.

- **CI, dependencies, and reporting:** CI performs the project-contract lifecycle in the right
  order, caches npm downloads, installs Chromium and Java, uploads Serenity output, preserves SUT
  logs on failure, and always tears down. `npm audit` is clean and direct dependency licences are
  compatible with the MIT repository. Action tags, workflow permissions, builder-image pinning,
  and Maven caching are the principal hardening opportunities.

- **Documentation and portfolio value:** The decision register, QA strategy, project contract,
  backlog, implementation log, audit, and handover create an unusually strong evidence trail.
  The README's PB-P5 status is stale, and several coverage claims are broader than their
  executable proof. Correcting those statements would make this a convincing senior-level example
  of honest, evidence-backed automation.

## Overall Project Rating

**Strong foundation with targeted remediation required.** The repository is reviewable, green,
and pedagogically useful. Risk #1 should be resolved before presenting FR-B1 as comprehensive live
contract conformance; Risks #2 through #5 are proportionate next improvements rather than reasons
to reject the architecture.

---

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_CODEX_v1_20260724T0020Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)
