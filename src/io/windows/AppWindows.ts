import { app, BrowserWindow, WebPreferences } from "electron";
import { join } from 'path';
import { APP_HOSTNAME, DEFAULT_PERSIST, RENDERER_PROTOCOL } from "../Constants.js";

interface CloseEvent extends Event {
  sender: BrowserWindow
}

interface WindowState {
  /**
   * When a window is a background window then it won't count towards opened windows count.
   * A window that is in the background will be closed when all other windows are closed.
   */
  background?: boolean;
}

interface WindowItem extends WindowState {
  window: BrowserWindow;
}

export class AppWindows {
  windows: WindowItem[] = [];

  /**
   * When set it won't quit the application when the last window is closed.
   * This is useful when a series of screens are opened.
   */
  ignoreQuit = false;

  get preload(): string {
    return join(__dirname, '..', '..', 'preload', 'base.preload.cjs.js');
  }

  get suiteIcon(): string {
    return join(__dirname, '..', '..', '..', '..', 'src', 'assets', 'icon.iconset', 'icon_16x16@2x.png');
  }

  constructor() {
    this.handleClose = this.handleClose.bind(this);
  }

  defaultWebPreferences(): WebPreferences {
    return {
      partition: DEFAULT_PERSIST,
      nodeIntegration: false,
      preload: this.preload,
      sandbox: true,
    }
  }

  pageUrl(path: string): URL {
    return new URL(path, `${RENDERER_PROTOCOL}://${APP_HOSTNAME}`)
  }

  register(window: BrowserWindow, state: WindowState = {}): void {
    const info: WindowItem = { ...state, window };
    this.windows.push(info);
    window.addListener('closed', this.handleClose);
  }

  protected handleClose(e: CloseEvent): void {
    const { sender } = e;
    const index = this.windows.findIndex(i => i.window === sender);
    if (index < 0) {
      return;
    }
    this.windows.splice(index, 1);
    this.quitIfNeeded();
  }

  hasActiveWindows(opts: { exclude?: BrowserWindow } = {}): boolean {
    const { exclude } = opts;
    return this.windows.some(i => {
      if (i.background) {
        return false;
      }
      if (exclude && exclude === i.window) {
        return false;
      }
      return true;
    });
  }

  quitIfNeeded(): void {
    if (this.ignoreQuit) {
      return;
    }
    const active = this.hasActiveWindows();
    if (active) {
      return;
    }
    app.quit();
  }
}

const instance = new AppWindows();
export default instance;
