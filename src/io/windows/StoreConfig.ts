import type { ConfigBroadcast, ConfigInitReason, IConfigEnvironment } from "@api-client/ui";
import { BrowserWindow, ipcMain } from "electron";
import appWindows from "./AppWindows.js";
import { logger } from "../Logger.js";
import initOptions from "../AppOptions.js";
import config from '../bindings/ConfigurationBindings.js';
import { ConfigBroadcastChannel } from "../Constants.js";

export class StoreConfig {
  static async shouldInitRun(): Promise<boolean> {
    const envs = await config.environment.list();
    let triggerInit = false;
    if (!envs) {
      triggerInit = true;
    } else if (!envs.current) {
      triggerInit = true
    } else if (!envs.environments || !envs.environments.length) {
      triggerInit = true
    } else if (!envs.environments.find(i => i.key === envs.current)) {
      triggerInit = true
    }
    return triggerInit;
  }

  window: BrowserWindow;

  resolve?: (value: void | PromiseLike<void>) => void;

  constructor() {
    this.window = new BrowserWindow({
      title: 'Store configuration',
      webPreferences: appWindows.defaultWebPreferences(),
    });
    this.window.removeMenu();
    this.window.setMenu(null);
    this.handleConfigEvent = this.handleConfigEvent.bind(this);
  }

  async runConfig(reason: ConfigInitReason = 'add'): Promise<void> {
    const url = appWindows.pageUrl('/dist/src/renderer/global/api-client/Config.html');
    url.searchParams.set('init-reason', reason)
    logger.debug(`Opening store configuration: ${url.toString()}`)
    appWindows.register(this.window);
    if (initOptions.dev) {
      this.window.webContents.openDevTools();
    }
    await this.window.loadURL(url.toString());
    this.window.addListener('close', this.handleClose.bind(this));
    ipcMain.addListener(ConfigBroadcastChannel, this.handleConfigEvent);
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  async runAuthenticate(): Promise<void> {
    appWindows.register(this.window);
    await this.authenticateStore();
    this.window.addListener('close', this.handleClose.bind(this));
    ipcMain.addListener(ConfigBroadcastChannel, this.handleConfigEvent);
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  protected handleClose(): void {
    if (this.resolve) {
      this.resolve();
      this.resolve = undefined;
    }
  }

  async handleConfigEvent(message: ConfigBroadcast): Promise<void> {
    if (['environment.add', 'environment.setDefault'].includes(message.path)) {
      this.handleStoreChange(message.env as IConfigEnvironment);
    } else if (message.path === 'environment.update') {
      this.handleEnvironmentUpdate(message.env as IConfigEnvironment);
    }
  }

  protected async handleStoreChange(env: IConfigEnvironment): Promise<void> {
    if (env.source === 'local-store') {
      await this.finish();
      return;
    }
    if (!env.authenticated) {
      await this.authenticateStore();
    } else {
      await this.finish();
    }
  }

  protected async finish(): Promise<void> {
    ipcMain.removeListener(ConfigBroadcastChannel, this.handleConfigEvent);
    if (this.resolve) {
      this.resolve();
      this.resolve = undefined;
    }
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  protected async authenticateStore(): Promise<void> {
    const url = appWindows.pageUrl('/dist/src/renderer/global/api-client/Authenticate.html');
    logger.debug(`Opening store authentication: ${url.toString()}`);
    if (initOptions.dev) {
      this.window.webContents.openDevTools();
    }
    await this.window.loadURL(url.toString());
  }

  protected async handleEnvironmentUpdate(env: IConfigEnvironment): Promise<void> {
    if (env.source === 'local-store' || env.authenticated) {
      await this.finish();
    }
  }
}
