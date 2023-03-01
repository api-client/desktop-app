/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IRequestProxyInit, IProxyResult, IRequestLog, IHttpProjectProxyInit, IHttpProjectStoreProxyInit, IProjectExecutionLog, IHttpRequest } from "@api-client/core";
import { ProxyBindings, Events } from "@api-client/ui";

export class ElectronProxyBindings extends ProxyBindings {

  coreRequest(init: IRequestProxyInit): Promise<IProxyResult<IRequestLog>> {
    return globalThis.ipc.proxy.coreRequest(init);
  }

  async coreHttpProject(init: IHttpProjectProxyInit | IHttpProjectStoreProxyInit): Promise<IProxyResult<IProjectExecutionLog>> {
    const env = await Events.Store.Global.getEnv();
    if (!env || !env.token) {
      throw new Error(`You are not authorized in the store to make a proxy request.`);
    }
    return globalThis.ipc.proxy.coreHttpProject(init, env.token, env.location);
  }
  
  httpSend(request: IHttpRequest, init: RequestInit = {}): Promise<Response> {
    return globalThis.ipc.proxy.httpSend(request, init);
  }
}
