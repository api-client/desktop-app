/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * An event dispatched from the IO thread to the clients.
 */
interface IoEvent {
  kind: 'IO#Event',
  id: number;
  type: 'error' | 'result';
  message?: string;
  result?: any;
}

/**
 * A command sent from the client to a IO thread.
 */
interface IoCommand {
  kind: 'IO#Command',
  id: number;
  fn: string;
  args: any[];
}

/* eslint-disable no-console */
class ProxyProcess {
  coreLib?: typeof import('@api-client/core');

  async initialize(): Promise<void> {
    console.debug('Importing the core libraries...');
    const Core = await import('@api-client/core');
    console.debug('The core libraries are ready.');
    this.coreLib = Core;
    process.parentPort.on('message', this.handleParentMessage.bind(this));
    console.debug('Notifying parent ready...');
    process.parentPort.postMessage({ cmd: 'initialized' });
  }

  protected handleParentMessage(event: Electron.MessageEvent): void {
    const { data } = event;
    this.handleMessage(data);
  }

  /**
   * To be called by the IO thread implementation when receiving a message from the client.
   */
  protected handleMessage(event: IoCommand | IoEvent): void {
    if (!event.kind) {
      console.warn('Invalid message received on the app-config-channel.', event);
      return;
    }
    if (event.kind === 'IO#Event') {
      // message sent by self.
      return;
    }
    const { args, fn, id } = event;

    if (typeof id !== 'number') {
      console.warn('Invalid message received on the app-config-channel. The id must be a number.');
      return;
    }

    if (typeof fn !== 'string' || !fn) {
      const err = new Error('Invalid message received on the io-channel. The second argument must be a function name to call.');
      this.notifyError(id, err);
      console.warn(err.message);
      return;
    }

    const callable = this.getFunction(fn);
    const isFunction = typeof callable === 'function';

    if (!isFunction) {
      const err = new Error(`Invalid message received on the io-channel. The function "${fn}" is either not implemented or invalid.`);
      this.notifyError(id, err);
      console.warn(err.message);
      return;
    }
    console.info(`Calling a proxy function: ${fn}`);
    this.call(callable as (...args: unknown[]) => Promise<unknown>, id, args);
  }

  protected notifyError(id: number, error: Error): void {
    const event: IoEvent = {
      kind: 'IO#Event',
      id,
      type: 'error',
      result: error,
    };
    process.parentPort.postMessage(event);
  }

  protected getFunction(fn: string): (...args: unknown[]) => Promise<unknown> | undefined {
    const path = fn.trim().split('.');
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: any = this;
    path.forEach((key) => {
      if (!current) {
        return;
      }
      const scope = current;
      current = current[key as any];
      if (current && current.bind) {
        current = current.bind(scope);
      }
    });
    return current;
  }

  /**
   * Calls the function on self, creates a response event, and dispatches it.
   * 
   * @param fnName The function name to call.
   * @param id The request id sent back to the client.
   * @param args The function arguments.
   */
  protected async call(callable: (...args: unknown[]) => Promise<unknown>, id: number, args: any[]): Promise<void> {
    const event: IoEvent = {
      kind: 'IO#Event',
      id,
      type: 'result',
    };
    try {
      event.result = await callable(...args);
      process.parentPort.postMessage(event);
    } catch (e) {
      event.type = 'error';
      event.message = (e as Error).message;
      process.parentPort.postMessage(event);
    }
  }

  async handleCoreRequest(init: import('@api-client/core').IRequestProxyInit): Promise<import('@api-client/core').IProxyResult<import('@api-client/core').IRequestLog>> {
    const { coreLib } = this;
    if (!coreLib) {
      console.error('The core library not found.');
      throw new Error(`The core library not found.`);
    }
    const service = new coreLib.ProxyService();
    return service.proxyRequest(init);
  }

  handleCoreProject(init: import('@api-client/core').IHttpProjectStoreProxyInit, token: string, storeUri: string): Promise<import('@api-client/core').IProxyResult<import('@api-client/core').IProjectExecutionLog>> {
    const { coreLib } = this;
    if (!coreLib) {
      console.error('The core library not found.');
      throw new Error(`The core library not found.`);
    }
    const service = new coreLib.ProxyService();
    return service.proxyHttpProject(init, token, storeUri);
  }
}

const prc = new ProxyProcess();
process.parentPort.once('message', async () => {
  prc.initialize();
});
