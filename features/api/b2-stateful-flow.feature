@api
Feature: FR-B2 stateful multi-step flow
  The end-to-end scenario drives login, account creation, deposit, and transfer,
  verifying balances and transaction history at each step. A compact boundary outline
  covers DR-PB-09's zero, minimum-positive, and exact-available transfer amounts from
  independently reset seed state. Created-entity ids are always captured from responses.

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

  # PB-CODEX-04 / DR-PB-09. Account 12456 has a positive seeded balance, but the
  # exact-available amount is resolved from the live reset state rather than hardcoded.
  # Observed against pinned d1bf006 on 2026-08-01: every case is HTTP 200; zero leaves
  # balances unchanged, minimum-positive moves $0.01, exact-available leaves source at 0.
  @mutates @amount-boundary
  Scenario Outline: Transfer at the <boundary> amount boundary
    When he transfers the "<boundary>" amount boundary from account 12456 to account 12345
    Then the boundary transfer succeeds and both balances change by the resolved amount

    Examples:
      | boundary         |
      | zero             |
      | minimum-positive |
      | exact-available  |
