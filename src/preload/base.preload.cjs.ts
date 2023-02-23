type AppIpc = import("../types.js").AppIpc;
type FileReadOptions = import("@api-client/ui").FileReadOptions;
type FileWriteOptions = import("@api-client/ui").FileWriteOptions;
type ConfigBroadcast = import("@api-client/ui").ConfigBroadcast;
type ITelemetryConfig = import("@api-client/ui").ITelemetryConfig;
type IConfigEnvironment = import("@api-client/ui").IConfigEnvironment;
type AddConfigEnvironmentInit = import("@api-client/ui").AddConfigEnvironmentInit;
type IEnvConfig = import("@api-client/ui").IEnvConfig;
type IRequestProxyInit = import("@api-client/core").IRequestProxyInit;
type IProxyResult<T> = import("@api-client/core").IProxyResult<T>;
type IRequestLog = import("@api-client/core").IRequestLog;
type IProjectExecutionLog = import("@api-client/core").IProjectExecutionLog;
type IHttpProjectProxyInit = import("@api-client/core").IHttpProjectProxyInit;
type IHttpProjectStoreProxyInit = import("@api-client/core").IHttpProjectStoreProxyInit;
type IHttpRequest = import("@api-client/core").IHttpRequest;

/* eslint-disable @typescript-eslint/no-var-requires */
const { ipcRenderer, contextBridge } = require('electron/renderer');

const ipcBridge: AppIpc = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  handleConfig: function (channel: string, callback: (event: Electron.IpcRendererEvent, message: ConfigBroadcast) => void): void {
    ipcRenderer.on(channel, callback);
  },

  proxy: {
    coreRequest: function (init: IRequestProxyInit): Promise<IProxyResult<IRequestLog>> {
      return ipcRenderer.invoke('project-proxy', 'core', 'request', init);
    },
    coreHttpProject: function (init: IHttpProjectProxyInit | IHttpProjectStoreProxyInit): Promise<IProxyResult<IProjectExecutionLog>> {
      return ipcRenderer.invoke('project-proxy', 'core', 'http-project', init);
    },
    httpSend: function (request: IHttpRequest, init?: RequestInit | undefined): Promise<Response> {
      return ipcRenderer.invoke('project-proxy', 'http', 'send', request, init);
    }
  },

  config: {
    local: {
      get: async (key: string): Promise<unknown | undefined> => ipcRenderer.invoke('config-bindings', 'local', 'get', key),

      set: async (key: string, value: unknown): Promise<void> => ipcRenderer.invoke('config-bindings', 'local', 'set', key, value),

      delete: async (key: string): Promise<void> => ipcRenderer.invoke('config-bindings', 'local', 'delete', key),
    },

    session: {
      get: async (key: string): Promise<unknown> => ipcRenderer.invoke('config-bindings', 'session', 'get', key),

      set: async (key: string, value: unknown): Promise<void> => ipcRenderer.invoke('config-bindings', 'session', 'set', key, value),

      delete: async (key: string): Promise<void> => ipcRenderer.invoke('config-bindings', 'session', 'delete', key),
    },

    telemetry: {
      read: async (): Promise<ITelemetryConfig> => ipcRenderer.invoke('config-bindings', 'telemetry', 'read'),

      set: async (config: ITelemetryConfig): Promise<void> => ipcRenderer.invoke('config-bindings', 'telemetry', 'set', config),
    },

    environment: {
      add: async (env: IConfigEnvironment, init: AddConfigEnvironmentInit = {}): Promise<void> => ipcRenderer.invoke('config-bindings', 'environment', 'add', env, init),
      update: async (env: IConfigEnvironment): Promise<void> => ipcRenderer.invoke('config-bindings', 'environment', 'update', env),
      read: async (id?: string): Promise<IConfigEnvironment> => ipcRenderer.invoke('config-bindings', 'environment', 'read', id),
      remove: async (id: string): Promise<void> => ipcRenderer.invoke('config-bindings', 'environment', 'remove', id),
      setDefault: async (id: string): Promise<void> => ipcRenderer.invoke('config-bindings', 'environment', 'set-default', id),
      list: async (): Promise<IEnvConfig> => ipcRenderer.invoke('config-bindings', 'environment', 'list'),
    },
  },

  file: {
    writeFile: (path: string, contents: string | Buffer | BufferSource | Blob, opts?: FileWriteOptions): Promise<void> => ipcRenderer.invoke('file-bindings', 'write', path, contents, opts),
    readFile: (path: string, opts: FileReadOptions = {}): Promise<string | Buffer | ArrayBuffer> => ipcRenderer.invoke('file-bindings', 'read', path, opts),
  },

  navigate: {
    page: (page: string, query: Record<string, string> = {}): Promise<void> => ipcRenderer.invoke('navigation-bindings', page, query),
  },
}

contextBridge.exposeInMainWorld('ipc', ipcBridge);

const APP_VERSION = process.env.APP_VERSION as string;
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  app: () => APP_VERSION,
});

const env: NodeJS.ProcessEnv = {};
// const PLATFORM = process.platform;
Object.keys(process.env).forEach((key) => {
  if (key.indexOf('npm_') === 0 || key.indexOf('APP_') === 0) {
    return;
  }
  env[key] = process.env[key];
});

contextBridge.exposeInMainWorld('env', env);

contextBridge.exposeInMainWorld('logger', {
  error: (...args: unknown[]): Promise<void> => ipcRenderer.invoke('logger', 'error', ...args),
  warn: (...args: unknown[]): Promise<void> => ipcRenderer.invoke('logger', 'warn', ...args),
  info: (...args: unknown[]): Promise<void> => ipcRenderer.invoke('logger', 'info', ...args),
  http: (...args: unknown[]): Promise<void> => ipcRenderer.invoke('logger', 'http', ...args),
  verbose: (...args: unknown[]): Promise<void> => ipcRenderer.invoke('logger', 'verbose', ...args),
  debug: (...args: unknown[]): Promise<void> => ipcRenderer.invoke('logger', 'debug', ...args),
  silly: (...args: unknown[]): Promise<void> => ipcRenderer.invoke('logger', 'silly', ...args),
});
