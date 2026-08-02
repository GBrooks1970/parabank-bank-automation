@ui
Feature: FR-A3 transfer funds
  The core transactional journey: a UI transfer whose money movement and transaction
  records are verified through the REST client.

  @mutates
  Scenario: Transfer between two seeded accounts, verified via REST
    Given Paula is on the ParaBank home page
    And she logs in through the UI as "john" using the seeded password
    And the REST balances of accounts 12345 and 12456 are recorded
    When she transfers $100.00 from account 12345 to account 12456 through the UI
    Then the UI confirms the transfer of $100.00
    And via REST account 12345 decreased by $100.00 and account 12456 increased by $100.00
    And via REST account 12345 has a "Funds Transfer Sent" transaction and account 12456 a "Funds Transfer Received" one
