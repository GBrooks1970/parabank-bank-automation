import { Account, AccountType } from './types';
import { withRequestDeadline } from './request-deadline';

/**
 * DR-PB-07: lightweight SOAP support — hand-built document-literal envelopes over fetch,
 * namespace-qualified parameters (probe F-04: unqualified params produce an unmarshalling
 * fault), minimal text extraction for the scalar fields parity checks need.
 * Revisit trigger (recorded in the decision register): usage beyond getAccount-class reads.
 */

const NS = 'http://service.parabank.parasoft.com/';
const SAFE_XML_NAME = /^[A-Za-z_][A-Za-z0-9._-]*$/;

export interface SoapResult {
  status: number;
  xml: string;
  /** faultstring content when the response is a SOAP fault. */
  fault?: string;
}

/**
 * Accept a deliberately small, prefix-free subset of XML names. Namespace prefixes are
 * supplied by this module, so callers cannot inject markup or replace the `par` prefix.
 */
function safeXmlName(kind: 'operation' | 'parameter' | 'response tag', name: string): string {
  if (!SAFE_XML_NAME.test(name)) {
    throw new Error(`SOAP ${kind} must be a safe XML name: ${JSON.stringify(name)}`);
  }
  return name;
}

/** Escape text content before placing a parameter value inside an XML element. */
export function escapeXmlText(value: string | number): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Build the current DR-PB-07 document-literal request shape. */
export function buildSoapEnvelope(
  operation: string,
  params: Record<string, string | number>,
  options: { qualifyParams?: boolean } = {}
): string {
  const { qualifyParams = true } = options;
  const prefix = qualifyParams ? 'par:' : '';
  const operationName = safeXmlName('operation', operation);
  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:par="${NS}">` +
    `<soapenv:Body><par:${operationName}>` +
    Object.entries(params)
      .map(([key, value]) => {
        const parameterName = safeXmlName('parameter', key);
        return `<${prefix}${parameterName}>${escapeXmlText(value)}</${prefix}${parameterName}>`;
      })
      .join('') +
    `</par:${operationName}></soapenv:Body></soapenv:Envelope>`
  );
}

export async function soapCall(
  baseUrl: string,
  operation: string,
  params: Record<string, string | number>,
  options: { qualifyParams?: boolean } = {}
): Promise<SoapResult> {
  const body = buildSoapEnvelope(operation, params, options);

  return withRequestDeadline(
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body
    },
    { operation: `SOAP ${operation}`, safePath: '/parabank/services/ParaBank' },
    async (signal) => {
      const res = await fetch(`${baseUrl}/parabank/services/ParaBank`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body,
        signal
      });
      const xml = await res.text();
      const fault = extractTag(xml, 'faultstring');
      return { status: res.status, xml, fault };
    }
  );
}

/** First `<tag>` text content, tolerating any namespace prefix. No DOM library (DR-PB-07). */
export function extractTag(xml: string, tag: string): string | undefined {
  const tagName = safeXmlName('response tag', tag);
  const match = new RegExp(`<(?:[\\w-]+:)?${tagName}>([^<]*)</(?:[\\w-]+:)?${tagName}>`).exec(xml);
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
