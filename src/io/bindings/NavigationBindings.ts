import { BrowserWindow, ipcMain } from "electron";
import { logger } from "../Logger.js";
import appWindows from "../windows/AppWindows.js";
import initOptions from "../AppOptions.js";

/**
 * An IO process that controls creation of application windows.
 */
export class NavigationBindings {
  listen(): void {
    ipcMain.handle('navigation-bindings', this.handler.bind(this));
  }

  createWindow(): BrowserWindow {
    const window = new BrowserWindow({
      title: 'API Client UI',
      webPreferences: appWindows.defaultWebPreferences(),
    });
    return window;
  }

  async openStaticPage(url: URL): Promise<void> {
    logger.debug(`Opening suite main window: ${url.toString()}`)
    const window = this.createWindow();
    appWindows.register(window);
    if (initOptions.dev) {
      window.webContents.openDevTools();
    }
    await window.loadURL(url.toString());
  }

  async handler(event: Electron.IpcMainInvokeEvent, page: string, query: Record<string, string> = {}): Promise<void> {
    logger.silly(`[IO Config]: Handling navigation event: ${page} from window ${event.sender.id}`);
    let tmp = page;
    if (tmp[0] !== '/') {
      tmp = `/${tmp}`;
    }
    const fullPage = `/dist/src/renderer/global${tmp}`;
    const url = appWindows.pageUrl(fullPage);
    if (query) {
      Object.keys(query).forEach((key) => {
        url.searchParams.set(key, query[key]);
      });
    }
    await this.openStaticPage(url);
  }
}
