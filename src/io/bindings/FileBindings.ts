import { readFile, writeFile } from "fs/promises";
import type { FileReadOptions, FileWriteOptions } from "@api-client/ui";
import { BrowserWindow, dialog, ipcMain, OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from "electron";

export class FileBindings {
  listen(): void {
    ipcMain.handle('file-bindings', this.handler.bind(this));
  }

  async handler(event: Electron.IpcMainInvokeEvent, ...args: unknown[]): Promise<unknown> {
    const group = args.splice(0, 1)[0] as string;
    switch (group) {
      case 'dialog': return this.handleDialog(event, ...args);
      case 'read': return this.handleRead(args[0] as string, args[1] as FileReadOptions);
      case 'write': return this.handleWrite(args[0] as string, args[1] as string | Buffer, args[2] as FileWriteOptions);
      default: throw new Error(`Unknown command: ${group}`);
    }
  }

  async handleDialog(event: Electron.IpcMainInvokeEvent, ...args: unknown[]): Promise<unknown> {
    const cmd = args[0] as string;
    switch (cmd) {
      case 'save': return this.saveDialog(args[1] as SaveDialogOptions);
      case 'open': return this.openDialog(event, args[1] as OpenDialogOptions);
      default: throw new Error(`Unknown file dialog command: ${cmd}`);
    }
  }

  async saveDialog(init: SaveDialogOptions): Promise<SaveDialogReturnValue> {
    if (!init) {
      throw new Error(`Expected save dialog options.`);
    }
    return dialog.showSaveDialog(init);
  }

  async openDialog(event: Electron.IpcMainInvokeEvent, init: OpenDialogOptions): Promise<OpenDialogReturnValue> {
    if (!init) {
      throw new Error(`Expected open dialog options.`);
    }
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      throw new Error(`Unable to find a window for the contents.`);
    }
    return dialog.showOpenDialog(win, init);
  }

  async handleRead(path: string, opts: FileReadOptions): Promise<unknown> {
    if (!opts) {
      throw new Error(`Expected options when reading a file.`);
    }
    const { returnType } = opts;
    if (returnType === 'buffer') {
      return readFile(path);
    }
    return readFile(path, 'utf8');
  }

  async handleWrite(path: string, contents: string | Buffer, opts: FileWriteOptions): Promise<void> {
    if (!opts) {
      throw new Error(`Expected options when writing to a file.`);
    }
    if (opts.encoding) {
      await writeFile(path, contents, opts.encoding);
    } else {
      await writeFile(path, contents);
    }
  }
}
