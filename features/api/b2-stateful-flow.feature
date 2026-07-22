@api
Feature: FR-B2 stateful multi-step flow
  One scenario drives login, account creation, deposit, and transfer, verifying
  balances and transaction history at each step. Every created-entity id is
  captured from responses — never hardcoded (test-data policy, design doc 5.8).

  @mutates
  Scenario: Login, create account, deposit, transfer, and verify state end to end
    Given John is logged in via REST with username "john" and password "demo"
    When he opens a new CHECKING account funded from account 12345
    Then the new account belongs to customer 12212 with type "CHECKING"
    And the new account's opening balance is recorded
    When he deposits $500.00 into the new account
    Then the new account's balance has increased by $500.00
    When he transfers $200.00 from the new account to account 13344
    Then the new account's balance has decreased by $200.00
    And the new account's transactions include a "Deposit" and a "Funds Transfer Sent"
