import { join } from 'path';
import { BrowserWindow, ipcMain } from 'electron';
import { writeFile } from 'fs/promises';
import { FsUtils } from '../FsUtils.js';
import { ConfigBroadcastChannel } from '../Constants.js';
import { logger } from '../Logger.js';
import type { ConfigBroadcast } from '@api-client/ui';
import initOptions from "../AppOptions.js";
import appWindows from "./AppWindows.js";

/**
 * Users privacy is a great concern for this project. Therefore this class
 * runs before the any app window is created to ask whether the user consent to 
 * send limited and anonymous data to Google Analytics.
 * 
 * This checks whether the lock file is created in the application folder. If so the 
 * consent flow is canceled. 
 * It renders the UI to ask the user about the analytics data. The user choice is
 * reflected in the application configuration.
 */
export class TelemetryConsent {
  lockFile: string;

  resolve?: (value: void | PromiseLike<void>) => void;

  window?: BrowserWindow;

  constructor() {
    this.lockFile = join(process.env.APP_HOME as string, '.telemetry-consent.lock');
    logger.debug(`Telemetry lock file set to ${this.lockFile}.`);
    this.handleConfigEvent = this.handleConfigEvent.bind(this);
  }

  /**
   * Runs the analytics data consent flow.
   */
  async run(): Promise<void> {
    const lockExists = await FsUtils.canRead(this.lockFile);
    if (lockExists) {
      logger.debug(`Telemetry lock file exists. Skipping telemetry dialog.`);
      return undefined;
    }
    logger.debug(`Opening the telemetry dialog...`);
    await this.renderDialog();
    ipcMain.addListener(ConfigBroadcastChannel, this.handleConfigEvent);

    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  async renderDialog(): Promise<void> {
    const bw = new BrowserWindow({
      title: 'Telemetry consent screen',
      webPreferences: appWindows.defaultWebPreferences(),
    });
    bw.removeMenu();
    bw.setMenu(null);
    appWindows.register(bw);
    const url = appWindows.pageUrl('/dist/src/renderer/global/api-client/TelemetryConsent.html');
    logger.debug(`Opening telemetry page: ${url.toString()}`)
    bw.loadURL(url.toString());
    if (initOptions.dev) {
      bw.webContents.openDevTools();
    }
    this.window = bw;
  }

  async handleConfigEvent(message: ConfigBroadcast): Promise<void> {
    if (message.path !== 'telemetry.set') {
      return;
    }
    ipcMain.removeListener(ConfigBroadcastChannel, this.handleConfigEvent);
    await writeFile(this.lockFile, 'Do not remove this file. It prohibits showing the telemetry dialog.');
    if (this.resolve) {
      this.resolve();
      this.resolve = undefined;
    }
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }
}
