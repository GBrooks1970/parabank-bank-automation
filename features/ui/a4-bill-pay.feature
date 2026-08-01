@ui
Feature: FR-A4 bill pay
  Paying a bill to a generated payee; the resulting debit is verified through the
  REST client.

  @mutates
  Scenario: Pay a bill from a seeded account, verified via REST
    Given Paula is on the ParaBank home page
    And she logs in through the UI as "john" with password "demo"
    And the REST balance of account 12345 is recorded as the funding baseline
    When she pays a bill of $75.00 to a generated payee from account 12345 through the UI
    Then the UI confirms the bill payment completed for $75.00
    And via REST the funding account 12345 decreased by exactly $75.00
    And via REST account 12345 has a "Bill Payment" transaction naming that payee
