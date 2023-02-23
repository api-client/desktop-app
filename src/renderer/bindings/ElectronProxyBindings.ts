/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IRequestProxyInit, IProxyResult, IRequestLog, IHttpProjectProxyInit, IHttpProjectStoreProxyInit, IProjectExecutionLog, IHttpRequest } from "@api-client/core";
import { ProxyBindings } from "@api-client/ui";

export class ElectronProxyBindings extends ProxyBindings {

  coreRequest(init: IRequestProxyInit): Promise<IProxyResult<IRequestLog>> {
    return globalThis.ipc.proxy.coreRequest(init);
  }

  coreHttpProject(init: IHttpProjectProxyInit | IHttpProjectStoreProxyInit): Promise<IProxyResult<IProjectExecutionLog>> {
    return globalThis.ipc.proxy.coreHttpProject(init);
  }
  
  httpSend(request: IHttpRequest, init: RequestInit = {}): Promise<Response> {
    return globalThis.ipc.proxy.httpSend(request, init);
  }
}
