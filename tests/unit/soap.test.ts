import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSoapEnvelope, extractTag, parseAccountSoapResponse } from '../../src/api/soap';

test('buildSoapEnvelope emits the normal qualified document-literal request', () => {
  const xml = buildSoapEnvelope('getAccount', { accountId: 12345 });

  assert.equal(
    xml,
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
      'xmlns:par="http://service.parabank.parasoft.com/">' +
      '<soapenv:Body><par:getAccount><par:accountId>12345</par:accountId>' +
      '</par:getAccount></soapenv:Body></soapenv:Envelope>'
  );
});

test('buildSoapEnvelope preserves the observed unqualified fault-path request option', () => {
  const xml = buildSoapEnvelope('getAccount', { accountId: 12345 }, { qualifyParams: false });

  assert.match(xml, /<accountId>12345<\/accountId>/);
  assert.doesNotMatch(xml, /<par:accountId>/);
});

test('SOAP response helpers parse namespace-tolerant account fields and faults', () => {
  const xml =
    '<soap:Envelope><soap:Body><ns:getAccountResponse><ns:getAccountReturn>' +
    '<id>12345</id><customerId>12212</customerId><type>CHECKING</type><balance>-42.5</balance>' +
    '</ns:getAccountReturn></ns:getAccountResponse></soap:Body></soap:Envelope>';

  assert.deepEqual(parseAccountSoapResponse(xml, 12345), {
    id: 12345,
    customerId: 12212,
    type: 'CHECKING',
    balance: -42.5
  });
  assert.equal(extractTag('<soap:faultstring>normal fault</soap:faultstring>', 'faultstring'), 'normal fault');
});
