import { Text } from '@serenity-js/web';
import { LoanPage, NavPanel, OpenAccountPage, OverviewPage, RightPanel, TransferPage, BillPayPage } from './pages';

/** Lane A questions — noun phrases (docs/naming-conventions.md). */

export const TheWelcomeMessage = () => Text.of(NavPanel.welcome).describedAs('the welcome message');

export const TheOverviewTableText = () => Text.of(OverviewPage.accountTable).describedAs('the accounts overview');

export const TheContentTitle = () => Text.of(RightPanel.title).describedAs('the content title');

export const TheNewAccountId = () => Text.of(OpenAccountPage.newAccountId).describedAs('the new account id');

export const TheTransferResultText = () => Text.of(TransferPage.result).describedAs('the transfer result');

export const TheBillPayResultText = () => Text.of(BillPayPage.result).describedAs('the bill payment result');

export const TheLoanStatus = () => Text.of(LoanPage.status).describedAs('the loan status');

export const TheNewLoanAccountId = () => Text.of(LoanPage.newLoanAccountId).describedAs('the new loan account id');
