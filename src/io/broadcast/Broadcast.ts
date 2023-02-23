import { BrowserWindow, ipcMain } from "electron";
import { logger } from "../Logger.js";

/**
 * Mimics the behavior of the BroadcastChannel in a browser.
 */
export class Broadcast {
  private channelInternal: string;

  get channel(): string {
    return this.channelInternal;
  }

  /**
   * @param channelName The name of the channel in the renderer process.
   */
  constructor(channelName: string) {
    this.channelInternal = channelName;
  }

  postMessage(message?: unknown): void {
    logger
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      if (win.title === 'Broadcast process') {
        logger.debug(`Sending a broadcast message to the broadcast process. Channel: ${this.channelInternal}.`);
        win.webContents.send(this.channelInternal, message);
      }
      // win.webContents.postMessage(this.channelInternal, message);
    });
    ipcMain.emit(this.channelInternal, message);
  }
}
