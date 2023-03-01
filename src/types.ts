/* eslint-disable no-var */
// import { AppEnvironment as Environment } from './preload/AppEnvironment.js';

import type { IHttpProjectProxyInit, IHttpProjectStoreProxyInit, IHttpRequest, IProjectExecutionLog, IProxyResult, IRequestLog, IRequestProxyInit } from "@api-client/core";
import type { ConfigBroadcast, EnvironmentConfiguration, FileReadOptions, FileWriteOptions, LocalConfiguration, SessionConfiguration, TelemetryConfiguration } from "@api-client/ui";

export interface AppVersionInfo {
  node: string;
  chrome: string;
  electron: string;
  app: string;
}

export { };

export interface Logger {
  error(...args: unknown[]): Promise<void>;
  warn(...args: unknown[]): Promise<void>;
  info(...args: unknown[]): Promise<void>;
  http(...args: unknown[]): Promise<void>;
  verbose(...args: unknown[]): Promise<void>;
  debug(...args: unknown[]): Promise<void>;
  silly(...args: unknown[]): Promise<void>;
}

export interface AppIpc {
  /**
   * Handles messages sent via the `app-config` channel. Note, this is *only* received by the BroadcastWindow.
   */
  handleConfig(channel: string, callback: (event: Electron.IpcRendererEvent, message: ConfigBroadcast) => void): void;

  proxy: {
    coreRequest(init: IRequestProxyInit): Promise<IProxyResult<IRequestLog>>;
    coreHttpProject(init: IHttpProjectProxyInit | IHttpProjectStoreProxyInit, token: string, storeUri: string): Promise<IProxyResult<IProjectExecutionLog>>;
    httpSend(request: IHttpRequest, init?: RequestInit): Promise<Response>;
  }

  config: {
    local: LocalConfiguration;
    session: SessionConfiguration;
    telemetry: TelemetryConfiguration;
    environment: EnvironmentConfiguration;
  },

  file: {
    saveFileDialog(options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue>;
    openFileDialog(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue>;
    writeFile(path: string, contents: string | Buffer | BufferSource | Blob, opts?: FileWriteOptions): Promise<void>;
    readFile(path: string, opts?: FileReadOptions): Promise<string | Buffer | ArrayBuffer>;
  },

  navigate: {
    /**
     * Navigates to the page under `src/renderer/global`.
     * 
     * @param page In format `/page-folder/page.html`
     * @param query Optional query parameters.
     */
    page(page: string, query?: Record<string, string>): Promise<void>;
  }
}

declare global {
  var ipc: AppIpc;
  var logger: Logger;
  var versions: AppVersionInfo;
}
