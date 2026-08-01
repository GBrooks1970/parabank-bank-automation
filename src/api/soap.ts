import { Account, AccountType } from './types';

/**
 * DR-PB-07: lightweight SOAP support — hand-built document-literal envelopes over fetch,
 * namespace-qualified parameters (probe F-04: unqualified params produce an unmarshalling
 * fault), minimal text extraction for the scalar fields parity checks need.
 * Revisit trigger (recorded in the decision register): usage beyond getAccount-class reads.
 */

const NS = 'http://service.parabank.parasoft.com/';

export interface SoapResult {
  status: number;
  xml: string;
  /** faultstring content when the response is a SOAP fault. */
  fault?: string;
}

/** Build the current DR-PB-07 document-literal request shape. PB-CODEX-10 owns hardening. */
export function buildSoapEnvelope(
  operation: string,
  params: Record<string, string | number>,
  options: { qualifyParams?: boolean } = {}
): string {
  const { qualifyParams = true } = options;
  const prefix = qualifyParams ? 'par:' : '';
  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:par="${NS}">` +
    `<soapenv:Body><par:${operation}>` +
    Object.entries(params)
      .map(([key, value]) => `<${prefix}${key}>${value}</${prefix}${key}>`)
      .join('') +
    `</par:${operation}></soapenv:Body></soapenv:Envelope>`
  );
}

export async function soapCall(
  baseUrl: string,
  operation: string,
  params: Record<string, string | number>,
  options: { qualifyParams?: boolean } = {}
): Promise<SoapResult> {
  const body = buildSoapEnvelope(operation, params, options);

  const res = await fetch(`${baseUrl}/parabank/services/ParaBank`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body
  });
  const xml = await res.text();
  const fault = extractTag(xml, 'faultstring');
  return { status: res.status, xml, fault };
}

/** First `<tag>` text content, tolerating any namespace prefix. No DOM library (DR-PB-07). */
export function extractTag(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<(?:[\\w-]+:)?${tag}>([^<]*)</(?:[\\w-]+:)?${tag}>`).exec(xml);
  return match?.[1];
}

/** Parse the normal getAccount response shape without performing network I/O. */
export function parseAccountSoapResponse(xml: string, accountId: number): Account {
  const field = (tag: string): string => {
    const value = extractTag(xml, tag);
    if (value === undefined) {
      throw new Error(`SOAP getAccount(${accountId}) response missing <${tag}>: ${xml}`);
    }
    return value;
  };
  return {
    id: Number(field('id')),
    customerId: Number(field('customerId')),
    type: field('type') as AccountType,
    balance: Number(field('balance'))
  };
}

/** Typed parity read: SOAP getAccount → the four fields FR-B3 compares. */
export async function getAccountSoap(baseUrl: string, accountId: number): Promise<Account> {
  const result = await soapCall(baseUrl, 'getAccount', { accountId });
  if (result.fault) {
    throw new Error(`SOAP fault from getAccount(${accountId}): ${result.fault}`);
  }
  return parseAccountSoapResponse(result.xml, accountId);
}
