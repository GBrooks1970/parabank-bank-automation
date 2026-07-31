@api
Feature: FR-B1 operation-aware REST contract conformance
  The SUT serves its own OpenAPI 3.0.1 document. Each approved client operation
  binds to its live method, path, response status/default, media type, and response
  schema; detached component-name checks are not sufficient evidence.
  Named SUT deviations remain narrow backlog risks, never silent allowances.

  # Smoke scenario 2 of 3 (design doc 5.9): read-only against seed state.
  @smoke
  Scenario: Seeded login and account list conform to their live operations
    When John logs in via REST with username "john" and password "demo"
    Then the response conforms to approved operation login
    When customer 12212's accounts are read via REST
    Then the response conforms to approved operation accounts

  Scenario: A seeded account read conforms to its live operation
    When account 12345 is read via REST
    Then the response conforms to approved operation account

  # PBR-01 (docs/backlog.md): the live spec declares Transaction.date as string/date-time
  # but the SUT returns epoch milliseconds. The operation matrix owns the named allowance.
  Scenario: A seeded account's transactions conform apart from PBR-01
    When account 12345's transactions are read via REST
    Then the response conforms to approved operation transactions

  @mutates @contract-matrix
  Scenario: Every approved REST client operation has live operation evidence
    When the approved REST operation matrix is exercised
    Then all 14 approved REST client operations have operation-aware evidence
