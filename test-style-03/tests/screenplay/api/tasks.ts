import { Ensure, equals, isPresent } from '@serenity-js/assertions';
import { Answerable, Check, q, Question, Task } from '@serenity-js/core';
import { GetRequest, LastResponse, PostRequest, Send } from '@serenity-js/rest';
import { Account, BANK, Customer, JSON_HEADERS } from './endpoints';
import { TheBalanceOf, TheFirstFundedCheckingAccountId, TheFirstSavingsAccount, TheFirstSavingsAccountId, TheTransactionIdsOf } from './questions';
import { idOf, NotedAccount, theNotes } from '../notes';

/** API tasks: imperative verb phrases (docs/naming-conventions.md). */

/**
 * Account ids are never hard-coded (brief: "discover the appropriate accounts").
 * Logs in through the API, lists the accounts, and notes the first CHECKING account holding
 * at least $100 plus the first SAVINGS account, opening one if none exists.
 */
export const DiscoverTheStandardCustomer = (
  username = process.env.PARABANK_USERNAME ?? 'john',
  password = process.env.PARABANK_PASSWORD ?? 'demo'
): Task =>
  Task.where(
    `#actor discovers ${username}'s CHECKING and SAVINGS accounts`,
    Send.a(GetRequest.to(`${BANK}/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`).using({ headers: JSON_HEADERS })),
    Ensure.that(LastResponse.status(), equals(200)),
    theNotes().set('customerId', LastResponse.body<Customer>().id),

    Send.a(GetRequest.to(q`${BANK}/customers/${theNotes().get('customerId')}/accounts`).using({ headers: JSON_HEADERS })),
    Ensure.that(LastResponse.status(), equals(200)),
    theNotes().set('accounts', LastResponse.body<Account[]>()),
    theNotes().set('checkingId', TheFirstFundedCheckingAccountId()),

    Check.whether(TheFirstSavingsAccount(), isPresent())
      .andIfSo(theNotes().set('savingsId', TheFirstSavingsAccountId()))
      .otherwise(
        // newAccountType=1 is SAVINGS.
        Send.a(
          PostRequest.to(`${BANK}/createAccount`).using(
            Question.fromObject({
              headers: JSON_HEADERS,
              params: { customerId: theNotes().get('customerId'), newAccountType: 1, fromAccountId: theNotes().get('checkingId') }
            })
          )
        ),
        Ensure.that(LastResponse.status(), equals(200)),
        theNotes().set('savingsId', LastResponse.body<Account>().id)
      )
  );

/** Raw transfer: the response stays in LastResponse, unasserted, so negative tests can inspect it. */
export const TransferViaTheApi = (params: Record<string, Answerable<string | number>>): Task =>
  Task.where(
    '#actor submits a transfer request to the API',
    Send.a(PostRequest.to(`${BANK}/transfer`).using(Question.fromObject({ headers: JSON_HEADERS, params })))
  );

export const RecordTheBalanceOf = (account: NotedAccount): Task =>
  Task.where(
    `#actor records the ${account} balance`,
    theNotes().set(account === 'checking' ? 'checkingBalanceBefore' : 'savingsBalanceBefore', TheBalanceOf(idOf(account)))
  );

export const RecordTheTransactionIdsOf = (account: NotedAccount): Task =>
  Task.where(
    `#actor records the existing ${account} transaction ids`,
    theNotes().set('knownTransactionIds', TheTransactionIdsOf(idOf(account)))
  );
