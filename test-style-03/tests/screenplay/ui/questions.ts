import { Text } from '@serenity-js/web';
import { TransferResult } from './targets';

/** Lane questions: noun phrases (docs/naming-conventions.md). */

export const TheTransferResultTitle = () => Text.of(TransferResult.title).describedAs('the transfer result title');

export const TheTransferredAmount = () => Text.of(TransferResult.amount).describedAs('the transferred amount');

export const TheTransferSourceAccount = () => Text.of(TransferResult.fromAccount).describedAs('the transfer source account');

export const TheTransferDestinationAccount = () =>
  Text.of(TransferResult.toAccount).describedAs('the transfer destination account');
