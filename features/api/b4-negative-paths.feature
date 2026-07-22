@api @negative
Feature: FR-B4 negative paths, asserted as observed
  ParaBank's error behaviour is unconventional and is asserted AS OBSERVED from the
  pinned SUT (assert-as-observed policy, design doc 5.7) — these scenarios document
  the demo app's real contract, they do not endorse it as good API design.
  Expected values below were observed live against d1bf006 on 2026-07-22.

  Scenario: Reading an unknown account is a plain-text 400, not a 404
    When account 99999 is read via REST expecting failure
    Then the response status is 400
    And the response body is the plain text "Could not find account #99999"

  Scenario: A non-numeric transfer amount is a 404 with an empty body
    Given John is logged in via REST with username "john" and password "demo"
    When he transfers "abc" from account 12345 to account 12456
    Then the response status is 404
    And the response body is empty

  # Overdrafts are permitted: the seed itself contains negative balances (probe F-07).
  @mutates
  Scenario: Transferring more than the available balance succeeds and overdraws the account
    Given John is logged in via REST with username "john" and password "demo"
    And the seeded balance of account 12456 is recorded
    When he transfers $999999.00 from account 12456 to account 12345
    Then the response status is 200
    And the response body is the plain text "Successfully transferred $999999 from account #12456 to account #12345"
    And account 12456's balance is now negative

  @soap
  Scenario: SOAP parameters without the service namespace produce an unmarshalling fault
    When a SOAP getAccount call is made for account 12456 with unqualified parameters
    Then the SOAP response status is 500
    And the SOAP fault mentions "Unmarshalling Error"
