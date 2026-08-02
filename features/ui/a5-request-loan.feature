@ui @loan
Feature: FR-A5 request a loan
  Loan decisions are pinned deterministic (design doc 5.6): the local provider with
  the down-payment processor at a 20% threshold, set through the admin API before
  each scenario and restored by the reset contract afterwards.
  Upstream approval rules (AbstractLoanProcessor + DownPaymentLoanProcessor):
    1. downPayment must not exceed the customer's available funds (sum of non-LOAN
       balances; the seeded customer 12212 has exactly 1692.67 at seed state), else
       denied outright;
    2. downPayment / amount must be >= the threshold (20%).
  Amounts below are chosen against the SEEDED state the reset bracket guarantees.

  @mutates
  Scenario: A loan with a sufficient down payment is approved
    Given the loan decision environment is pinned to the local down-payment processor at 20 percent
    And Paula is on the ParaBank home page
    And she logs in through the UI as "john" using the seeded password
    When she requests a loan of $5000.00 with a down payment of $1200.00 from account 12345 through the UI
    Then the UI shows the loan decision "Approved"
    And the UI shows a new loan account id

  @mutates
  Scenario: A loan with an insufficient down payment is denied
    Given the loan decision environment is pinned to the local down-payment processor at 20 percent
    And Paula is on the ParaBank home page
    And she logs in through the UI as "john" using the seeded password
    When she requests a loan of $5000.00 with a down payment of $100.00 from account 12345 through the UI
    Then the UI shows the loan decision "Denied"
