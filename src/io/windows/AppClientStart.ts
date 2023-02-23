import { BrowserWindow, app, Tray, Menu } from "electron";
import { logger } from "../Logger.js";
import appWindows from "./AppWindows.js";
import initOptions from "../AppOptions.js";

export class AppClientStart {
  window: BrowserWindow;

  tray: Tray;

  isQuitting = false;

  menu: Menu;

  constructor() {
    logger.debug(`Preparing the main window...`);
    this.window = new BrowserWindow({
      title: 'Store configuration',
      webPreferences: appWindows.defaultWebPreferences(),
    });
    this.window.removeMenu();
    this.window.setMenu(null);
    this.menu = this.createTrayContextMenu();
    this.tray = this.createTray();

    app.on('before-quit', () => {
      this.isQuitting = true;
    });
  }

  async run(): Promise<void> {
    const url = appWindows.pageUrl('/dist/src/renderer/global/api-client/Main.html');
    logger.debug(`Opening suite main window: ${url.toString()}`)
    appWindows.register(this.window);
    if (initOptions.dev) {
      this.window.webContents.openDevTools();
    }
    await this.window.loadURL(url.toString());
    this.menu.items[0].visible = false;
    this.window.addListener('close', this.handleClose.bind(this));
    this.window.addListener('minimize', this.handleMinimize.bind(this));
    this.window.addListener('show', this.handleShow.bind(this));
  }

  createTray(): Tray {
    const tray = new Tray(appWindows.suiteIcon);
    tray.setContextMenu(this.menu);
    return tray;
  }

  createTrayContextMenu(): Menu {
    const result = Menu.buildFromTemplate([
      {
        label: 'Show start screen', 
        click: (): void => {
          this.window.show()
        },
      },
      {
        label: 'Quit', 
        click: (): void => {
          this.isQuitting = true
          app.quit()
        }
      }
    ]);
    return result;
  }

  protected handleClose(event: Electron.Event): void {
    if (this.isQuitting) {
      return;
    }
    if (!appWindows.hasActiveWindows({ exclude: this.window})) {
      // if this window is the only one left then we quit instead of hiding in a tray.
      return;
    }

    event.preventDefault();
    this.window.hide();
    event.returnValue = false;
  }

  protected handleMinimize(event: Electron.Event): void {
    event.preventDefault()
    this.window.hide();
    this.menu.items[0].visible = true;
  }

  protected handleShow(): void {
    this.menu.items[0].visible = false;
    // this.tray.setHighlightMode('always')
  }
}
