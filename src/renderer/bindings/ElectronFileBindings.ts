import { 
  FileBindings, FileReadOptions, FileWriteOptions, 
  IOpenFileDialogInit, IOpenFileDialogResult, ISaveFileDialogInit, 
  ISaveFileDialogResult 
} from "@api-client/ui";
import { FileFilter, OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from "electron";

export class ElectronFileBindings extends FileBindings {
  async saveFileDialog(opts: ISaveFileDialogInit = {}): Promise<ISaveFileDialogResult> {
    const { filters, title, defaultPath, } = opts;
    const dialogOptions: SaveDialogOptions = {
      title,
      defaultPath,
    };
    if (Array.isArray(filters) && filters.length) {
      dialogOptions.filters = filters.map((i) => {
        const { accept, description } = i;
        const result: FileFilter = {
          name: description || '',
          extensions: [],
        };
        Object.keys(accept).forEach((key) => {
          const extensions = accept[key];
          result.extensions = result.extensions.concat(extensions);
        })
        return result;
      });
    }
    try {
      const result = await globalThis.ipc.invoke('file-bindings', 'dialog', 'save', dialogOptions) as SaveDialogReturnValue;
      return result;
    } catch (_) {
      return { canceled: true };
    }
  }

  async openFileDialog(opts: IOpenFileDialogInit = {}): Promise<IOpenFileDialogResult> {
    const { filters, multiple, defaultPath, title } = opts;
    const dialogOptions: OpenDialogOptions = {
      properties: [],
      defaultPath,
      title,
      buttonLabel: 'Open',
    };
    if (multiple) {
      dialogOptions.properties?.push('multiSelections');
    }
    if (Array.isArray(filters) && filters.length) {
      dialogOptions.filters = filters.map((i) => {
        const { accept, description } = i;
        const result: FileFilter = {
          name: description || '',
          extensions: [],
        };
        Object.keys(accept).forEach((key) => {
          const extensions = accept[key];
          result.extensions = result.extensions.concat(extensions);
        })
        return result;
      });
    }

    try {
      const result = await globalThis.ipc.invoke('file-bindings', 'dialog', 'open', dialogOptions) as OpenDialogReturnValue;
      return {
        canceled: result.canceled,
        filePath: result.filePaths,
      };
    } catch (_) {
      return { canceled: true };
    }
  }

  async writeFile(path: string, contents: string | Buffer | BufferSource | Blob, opts: FileWriteOptions = {}): Promise<void> {
    await globalThis.ipc.file.writeFile(path, contents, opts);
  }

  async readFile(path: string, opts: FileReadOptions  = {}): Promise<string | Buffer | ArrayBuffer> {
    return globalThis.ipc.file.readFile(path, opts);
  }

  async dispose(): Promise<void> {
    // ...
  }
}
