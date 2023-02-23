/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-bitwise */
import { session, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as mime from 'mime-types';
// import { fileURLToPath } from 'url';
import { logger } from './Logger.js';
import { DEFAULT_PERSIST, RENDERER_PROTOCOL } from './Constants.js';
import { FsUtils } from './FsUtils.js';

// const re = /import\s*(?:["']?([\w*{}\n, ]+)from\s*)?\s*["']?([@\w/\._-]+)["'].*/gm;
const locationPrefixes = ['node_modules', 'src'];

/**
 * A class responsible for handling `web-module:` protocol.
 *
 * Components protocol is used to load ES modules with correct mime types.
 *
 * Example usage in the renderer process:
 *
 * ```
 * <script type="module" href="web-module://polymer/polymer.js"></script>
 * ```
 *
 * This checks for existing component in following order:
 * - ./bower_components/{url} (application main components)
 * - {applicationUserDataDir}/{url} (application modules installation root)
 * - {url} (filesystem)
 *
 * If the component does not exists then it throws an error.
 */
export class EsmProtocol {
  basePath: string;

  constructor() {
    this.requestHandler = this.requestHandler.bind(this);
    const base = __dirname;
    // const base = path.dirname(fileURLToPath(import.meta.url));
    /**
     * Base path to the application folder.
     */
    this.basePath = path.join(base, '..', '..');
  }

  /**
   * Registers the protocol handler.
   * This must be called after the `ready` event.
   */
  register(): void {
    logger.debug('Registering ESM protocol');
    session.fromPartition(DEFAULT_PERSIST).protocol.registerBufferProtocol(RENDERER_PROTOCOL, this.requestHandler);
    protocol.registerBufferProtocol(RENDERER_PROTOCOL, this.requestHandler);
  }

  protected async requestHandler(request: Electron.ProtocolRequest, callback: (response: Electron.ProtocolResponse | Buffer) => void): Promise<void> {
    const url = new URL(request.url);
    let fileLocation = await this.findFile(url.pathname);
    fileLocation = decodeURI(fileLocation);
    let relative = fileLocation.replaceAll(this.basePath, '');
    if (relative.startsWith('/')) {
      relative = relative.substring(1);
    }
    
    if (relative.startsWith('src/')) {
      // relative = relative.replace('src/', 'dist/');
      relative = `dist/${relative}`;
    }
    
    logger.silly(`[ESM] Relative path: ${relative}`);

    try {
      const data = await fs.readFile(relative);
      const mimeType = mime.lookup(relative) || 'application/octet-stream';
      callback({
        mimeType,
        data,
      });
    } catch (e) {
      logger.error(e);
      // The file or directory cannot be found.
      // NET_ERROR(FILE_NOT_FOUND, -6)
      // @ts-ignore
      callback(-6);
    }


    // fs.readFile(fileLocation, async (error, data) => {
    //   if (error) {
    //     logger.error(error);
    //     // The file or directory cannot be found.
    //     // NET_ERROR(FILE_NOT_FOUND, -6)
    //     // @ts-ignore
    //     callback(-6);
    //   } else {
    //     // let content = data;
    //     const mimeType = mime.lookup(fileLocation) || 'application/octet-stream';
    //     // if (fileLocation.includes('node_modules/@api-modeling/')) {
    //     //   let str = data.toString();
    //     //   const matches = [...str.matchAll(re)];
    //     //   if (matches.length) {
    //     //     str = await this.makeRelativePaths(str, fileLocation, matches);
    //     //   }
    //     //   content = Buffer.from(str);
    //     // }
    //     callback({
    //       mimeType,
    //       data,
    //     });
    //   }
    // });
  }

  

  /**
   * Finds a file location in one of the predefined paths.
   * @param filepath Request path
   * @param prefixes Location prefixes
   * @returns Location of the file.
   */
  async findFile(filepath: string, prefixes: string[] = locationPrefixes): Promise<string> {
    for (let i = 0, len = prefixes.length; i <len; i++) {
      const prefix = prefixes[i];
      const loc = path.join(this.basePath, prefix, filepath);
      
      if (await FsUtils.canRead(loc)) {
        return loc;
      }
    }
    return path.join(this.basePath, filepath);
  }

  async makeRelativePaths(content: string, fileLocation: string, matches: RegExpMatchArray[]): Promise<string> {
    let result = content;
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const importPath = match[2];
      if (!importPath) {
        continue;
      }
      const relativeImport = importPath.startsWith('.') || importPath.startsWith('/');
      if (relativeImport) {
        continue;
      }
      const resolved = await this.resolveImportFile(fileLocation, importPath);
      if (!resolved) {
        continue;
      }
      result = result.replace(importPath, resolved);
    }
    return result;
  }

  async resolveImportFile(srcFile: string, importPath: string): Promise<string|null> {
    const ext = path.extname(importPath);
    const absolutePath = await this.findFile(importPath, ['node_modules']);
    if (!absolutePath) {
      return null;
    }
    const appRoot = this.basePath;
    if (ext) {
      if (!absolutePath.startsWith(appRoot)) {
        // only internal paths are allowed
        return null;
      }
      return absolutePath.replace(appRoot, '');
      // return path.join(path.relative(absolutePath, appRoot), path.relative(appRoot, absolutePath));
      // return path.relative(srcFile, absolutePath);
    }
    const resolvedPath = await this.resolveModule(absolutePath);
    if (typeof resolvedPath !== 'string') {
      return null;
    }
    if (!resolvedPath.startsWith(appRoot)) {
      // only internal paths are allowed
      return null;
    }
    return resolvedPath.replace(appRoot, '');
    // return path.join(path.relative(resolvedPath, appRoot), path.relative(appRoot, resolvedPath));
    // return path.relative(srcFile, resolvedPath);
  }

  async resolveModule(absolutePath: string): Promise<string | null> {
    const pkgFile = path.join(absolutePath, 'package.json');
    const pkgExists = await FsUtils.canRead(pkgFile);
    if (pkgExists) {
      const manifestContents = await FsUtils.readJson(pkgFile) as { main?: string, module?: string };
      if (!manifestContents) {
        return null;
      }
      const { main, module } = manifestContents;
      if (module) {
        return path.join(absolutePath, module);
      }
      if (main) {
        return path.join(absolutePath, main);
      }
    }
    const indexFile = path.join(absolutePath, 'index.js');
    const indexExists = await FsUtils.canRead(indexFile);
    if (indexExists) {
      return indexFile;
    }
    return null;
  }
}
