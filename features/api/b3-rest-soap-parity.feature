@api @soap
Feature: FR-B3 REST-SOAP parity
  UI, REST, and SOAP share one datastore (probe F-04/F-05): after any mutation,
  the same read through both protocols must agree on id, customerId, type, and
  balance.

  # Smoke scenario 3 of 3 (design doc 5.9): read-only against seed state.
  @smoke
  Scenario: SOAP and REST agree on a seeded account without any mutation
    When account 12345 is read via REST and via SOAP
    Then both reads agree on id, customerId, type, and balance

  @mutates
  Scenario: SOAP sees a REST mutation immediately
    Given John is logged in via REST with username "john" and password "demo"
    And the seeded balance of account 12456 is recorded
    When he transfers $50.00 from account 12345 to account 12456
    And account 12456 is read via REST and via SOAP
    Then both reads agree on id, customerId, type, and balance
    And the agreed balance is $50.00 higher than the seeded balance
