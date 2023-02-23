import { BrowserWindow } from "electron";
import { logger } from "../Logger.js";
import appWindows from "./AppWindows.js";

export class BroadcastWindow {
  window: BrowserWindow;

  constructor() {
    this.window = new BrowserWindow({
      title: 'Broadcast process',
      show: false,
      frame: false,
      paintWhenInitiallyHidden: false,
      webPreferences: appWindows.defaultWebPreferences(),
    });
    this.window.removeMenu();
    this.window.setMenu(null);
  }

  async initialize(): Promise<void> {
    const url = appWindows.pageUrl('/dist/src/renderer/global/io/Broadcast.html');
    logger.debug(`Opening broadcast process: ${url.toString()}`)
    appWindows.register(this.window, { background: true });
    // this.window.webContents.openDevTools();
    try {
      await this.window.loadURL(url.toString());
    } catch (e) {
      logger.warn(e);
    }
  }
}
