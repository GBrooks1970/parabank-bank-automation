@api
Feature: FR-B1 REST contract conformance
  The SUT serves its own OpenAPI 3.0.1 spec; responses from the in-scope endpoints
  must conform to that live-fetched spec's schemas and documented status codes.
  Spec deviations discovered here are recorded as backlog risks, never silently
  accommodated (design doc FR-B1).

  # Smoke scenario 2 of 3 (design doc 5.9): read-only against seed state.
  @smoke
  Scenario: Seeded login and account list conform to the live spec
    When John logs in via REST with username "john" and password "demo"
    Then the response status is 200
    And the response body conforms to schema "Customer"
    And the live spec documents status 200 for "GET /login/{username}/{password}"
    When customer 12212's accounts are read via REST
    Then the response status is 200
    And every element of the response body conforms to schema "Account"

  Scenario: A seeded account read conforms to the live spec
    When account 12345 is read via REST
    Then the response status is 200
    And the response body conforms to schema "Account"
    And the live spec documents status 200 for "GET /accounts/{accountId}"

  # PBR-01 (docs/backlog.md): the live spec declares Transaction.date as string/date-time
  # but the SUT returns epoch milliseconds. Recorded risk, narrowly allowed here.
  Scenario: A seeded account's transactions conform to the live spec
    When account 12345's transactions are read via REST
    Then the response status is 200
    And every element of the response body conforms to schema "Transaction" allowing the known deviation "/date must be string"
