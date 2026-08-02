@ui
Feature: FR-A2 open a new account
  A logged-in customer opens a new account funded from an existing one. Balance
  outcomes are verified through the REST client (design doc FR-A2) — the UI alone
  is weak evidence for money movement.

  @mutates
  Scenario: Open a new CHECKING account funded from a seeded account
    Given Paula is on the ParaBank home page
    And she logs in through the UI as "john" using the seeded password
    And the REST balance of account 12345 is recorded as the funding baseline
    When she opens a new "CHECKING" account funded from account 12345 through the UI
    Then the UI confirms the new account and its id is captured
    And via REST the new account belongs to customer 12212 with a positive opening balance
    And via REST the funding account 12345 decreased by exactly the new account's opening balance

  @mutates
  Scenario: Open a new SAVINGS account funded from a seeded account
    Given Paula is on the ParaBank home page
    And she logs in through the UI as "john" using the seeded password
    And the REST balance of account 12345 is recorded as the funding baseline
    When she opens a new "SAVINGS" account funded from account 12345 through the UI
    Then the UI confirms the new account and its id is captured
    And via REST the new account belongs to customer 12212 with a positive opening balance
    And via REST the funding account 12345 decreased by exactly the new account's opening balance
