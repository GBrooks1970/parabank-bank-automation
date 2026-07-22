import { ParaBankRestClient } from '../api/client';
import { soapCall, SoapResult } from '../api/soap';
import { ApiResponse } from '../api/types';

/** Lane B ability: call ParaBank over REST; keeps the last raw response for Questions. */
export class CallParaBankRest {
  lastResponse?: ApiResponse;

  constructor(public readonly client: ParaBankRestClient) {}

  async call(invoke: (client: ParaBankRestClient) => Promise<ApiResponse>): Promise<ApiResponse> {
    this.lastResponse = await invoke(this.client);
    return this.lastResponse;
  }

  get last(): ApiResponse {
    if (!this.lastResponse) {
      throw new Error('No REST call has been made yet in this scenario');
    }
    return this.lastResponse;
  }
}

/** Lane B ability: call ParaBank over SOAP (DR-PB-07); keeps the last result. */
export class CallParaBankSoap {
  lastResult?: SoapResult;

  constructor(public readonly baseUrl: string) {}

  async call(
    operation: string,
    params: Record<string, string | number>,
    options?: { qualifyParams?: boolean }
  ): Promise<SoapResult> {
    this.lastResult = await soapCall(this.baseUrl, operation, params, options);
    return this.lastResult;
  }

  get last(): SoapResult {
    if (!this.lastResult) {
      throw new Error('No SOAP call has been made yet in this scenario');
    }
    return this.lastResult;
  }
}
