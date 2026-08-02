@ui
Feature: FR-A1 register and first login
  A new customer can register through the UI and immediately use their credentials;
  the seeded customer's login is the read-only smoke entry point.

  # Smoke scenario 1 of 3 (design doc 5.9): read-only against seed state.
  @smoke
  Scenario: Seeded login shows the accounts overview
    Given Paula is on the ParaBank home page
    When she logs in through the UI as "john" using the seeded password
    Then the overview greets "John Smith"
    And the accounts overview lists account 12345

  @mutates
  Scenario: A newly registered customer can log in with their new credentials
    Given Paula is on the ParaBank home page
    When she registers a new customer with generated unique details
    Then the registration confirmation greets the new username
    When she logs out
    And she logs in through the UI with the newly registered credentials
    Then the overview greets the new customer's full name
