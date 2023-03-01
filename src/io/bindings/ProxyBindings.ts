import type { IHttpRequest, IRequestProxyInit, IHttpProjectStoreProxyInit, Response, IProjectExecutionLog, IProxyResult, IRequestLog } from "@api-client/core";
import type { IoCommand, IoEvent, QueueItem } from "@api-client/ui";
import { ipcMain, utilityProcess } from "electron";
import { join } from "path";
import { logger } from "../Logger.js";

/**
 * IO bindings for HTTP proxy.
 * This spawns a process that runs the core runtime and handles renderer messages to 
 * make HTTP requests.
 * 
 * Since electron does not support ESM it is impossible to run the runtime on either renderer or IO side as Core libraries are ESM only.
 */
export class ProxyBindings {
  child?: Electron.UtilityProcess;

  /**
   * Used with the queue as the identifier of the request.
   * USe the `getId()` to read a unique request id.
   */
  private id = 0;

  protected queue: QueueItem[] = [];
  
  initialize(): Promise<void> {
    logger.debug('Initializing the proxy bindings.');
    ipcMain.handle('project-proxy', this.handler.bind(this));
    return new Promise((resolve) => {
      const url = join(__dirname, 'ProxyProcess.js');
      logger.debug(`Creating the child process: ${url}`);
      const child = utilityProcess.fork(url, [], { stdio: 'pipe', serviceName: 'API Client HTTP Proxy', execArgv: ['--inspect'] });
      this.child = child;

      const { stdout, stderr } = child;

      if (stdout) {
        stdout.on('data', (data) => {
          logger.debug(`[Proxy out] ${data.toString().trim()}`)
        });
      }
      if (stderr) {
        stderr.on('data', (data) => {
          logger.error(`[Proxy err] ${data.toString().trim()}`)
        });
      }
      child.once('spawn', () => {
        logger.silly(`Sending the initialize command to the proxy child...`);
        child.postMessage({ cmd: 'initialize' });
      });

      child.once('message', () => {
        // The first message is the response to the `initialize` command.
        // The child process sends a message after it loads. This way we are sure
        // the process is loaded before we can continue with the application.
        logger.silly(`Received the init from the child process.`);
        child.on('message', this.handleChildMessage.bind(this));
        resolve();
      });
    });
  }

  /**
   * @returns A unique for the current session id.
   */
  protected getId(): number {
    this.id += 1;
    return this.id;
  }

  /**
   * Invokes a function in the IO thread.
   * 
   * @param fn The function name to invoke (or an identifier understood by the IO thread)
   * @param args The function arguments to pass.
   * @returns A promise that should be returned to the client's application logic. 
   * The promise is resolved when the IO thread sends an event with the same identifier generated with this call.
   */
  protected invoke(fn: string, ...args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const { child } = this;
      if (!child) {
        reject(new Error(`The proxy IO class not initialized.`));
        return;
      }

      const id = this.getId();
      const item = {
        resolve, reject, id, fn, args,
      };
      this.queue.push(item);
      const cmd: IoCommand = {
        id,
        fn,
        args,
        kind: 'IO#Command',
      };
      child.postMessage(cmd);
    });
  }

  protected handleChildMessage(e: IoCommand | IoEvent): void {
    logger.debug('Received message from the child process');
    this.handleIoMessage(e);
  }

  /**
   * To be called by the child class when the IO thread send an event.
   * It recognizes the type of the message sent by the IO thread an performs the requested operation.
   * 
   * @param message The message sent by the IO thread.
   */
  protected handleIoMessage(message: IoCommand | IoEvent): void {
    if (!message.kind) {
      logger.warn('Invalid message received on the app-config-channel.', message);
      return;
    }
    if (message.kind === 'IO#Command') {
      // message sent by self.
      return;
    }
    if (message.kind === 'IO#Event') {
      this.resolve(message);
    }
  }

  /**
   * Resolves a pending promise stored in the `queue`.
   * 
   * @param event The IO thread event
   */
  protected resolve(event: IoEvent): void {
    const { id, type, message, result } = event;
    if (typeof id !== 'number') {
      logger.warn(`Unknown event from the IO thread. Id is not a number.`, event);
      return;
    }
    const index = this.queue.findIndex(i => i.id === id);
    if (index < 0) {
      // this might be used by another tab.
      return;
    }
    const info = this.queue[index];
    this.queue.splice(index, 1);

    if (type === 'result') {
      info.resolve(result);
    } else if (type === 'error') {
      info.reject(new Error(message));
    } else {
      logger.warn(`Unknown event from the IO thread`, event);
    }
  }

  async handler(event: Electron.IpcMainInvokeEvent, ...args: unknown[]): Promise<unknown> {
    const group = args.splice(0, 1)[0] as string;
    switch (group) {
      case 'core': return this.handleCore(args[0] as 'request' | 'http-project', args[1] as IRequestProxyInit | IHttpProjectStoreProxyInit, args[2] as string | undefined, args[3] as string | undefined);
      case 'http': return this.handleHttp(args[0] as 'send', args[1] as IHttpRequest, args[2] as RequestInit);
      default: throw new Error(`Unknown command: ${group}`);
    }
  }

  async handleCore(type: 'request' | 'http-project', init: IRequestProxyInit | IHttpProjectStoreProxyInit, token?: string, storeUri?: string): Promise<IProxyResult<IRequestLog | IProjectExecutionLog>> {
    switch (type) {
      case 'request': return this.handleCoreRequest(init as IRequestProxyInit);
      case 'http-project': return this.handleCoreProject(init as IHttpProjectStoreProxyInit, token, storeUri);
      default: throw new Error(`Unknown core: ${type}`);
    }
  }

  handleCoreRequest(init: IRequestProxyInit): Promise<IProxyResult<IRequestLog>> {
    return this.invoke('handleCoreRequest', init) as Promise<IProxyResult<IRequestLog>>;
  }

  handleCoreProject(init: IHttpProjectStoreProxyInit, token?: string, storeUri?: string): Promise<IProxyResult<IProjectExecutionLog>> {
    if (!token) {
      throw new Error(`Store token is not set.`);
    }
    if (!storeUri) {
      throw new Error(`Store URI is not set.`);
    }
    return this.invoke('handleCoreProject', init, token, storeUri) as Promise<IProxyResult<IProjectExecutionLog>>;
  }

  async handleHttp(type: 'send', request: IHttpRequest, init: RequestInit): Promise<Response> {
    const { child } = this;
    if (!child) {
      throw new Error(`The proxy IO class not initialized.`);
    }
    switch (type) {
      case 'send': return this.handleHttpSend(request, init);
      default: throw new Error(`Unknown http: ${type}`);
    }
  }

  handleHttpSend(request: IHttpRequest, init: RequestInit): Promise<Response> {
    return this.invoke('handleHttpSend', request, init) as Promise<Response>;
  }
}
