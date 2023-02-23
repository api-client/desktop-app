import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './Logger.js';

export class AppPaths {
  protected settingsFileInternal?: string;

  /** 
   * The path to the application settings file
   */
  get settingsFile(): string {
    if (!this.settingsFileInternal) {
      throw new Error(`Invalid state. The "settingsFile" is not set.`);
    }
    return this.settingsFileInternal;
  }

  /**
   * Resolves the file path to a correct path if it's starts with `~`.
   *
   * @param file The file path
   * @returns The resolved path to the file.
   */
  resolvePath(file: string): string {
    let result = file;
    if (result[0] === '~') {
      result = app.getPath('home') + result.substring(1);
    }
    return result;
  }

  /**
   * @returns a location to the application directory depending on the OS
   */
  getAppDirectory(): string {
    switch (process.platform) {
      case 'darwin':
        return process.execPath.substring(0, process.execPath.indexOf('.app') + 4);
      case 'linux':
      case 'win32':
        return path.join(process.execPath, '..');
      default: return '';
    }
  }

  /**
   * Safely checks whether the current user has access to the location.
   * @param dir the location to test
   * @returns The location to the application directory depending on the OS
   */
  hasWriteAccess(dir: string): boolean {
    const testFilePath = path.join(dir, 'write.test');
    try {
      fs.writeFileSync(testFilePath, new Date().toISOString(), { flag: 'w+' });
      fs.unlinkSync(testFilePath);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Initializes settings file location in the application.
   * @param {string=} file Settings file location.
   */
  setSettingsFile(file?: string): void {
    logger.debug('Setting up the GLOBAL_SETTINGS_FILE variable.');
    let loc = file;
    if (loc) {
      loc = this.resolvePath(loc);
      const dir = path.dirname(loc);
      try {
        fs.mkdirSync(dir, { recursive: true });
        this.settingsFileInternal = loc;
      } catch (_) {
        logger.error(`Insufficient permission to settings file folder "${dir}".`);
      }
    }
    if (!this.settingsFileInternal) {
      if (!process.env.APP_HOME) {
        throw new Error(`The APP_HOME variable is not set.`);
      }
      this.settingsFileInternal = path.join(process.env.APP_HOME, 'settings.json');
    }
    process.env.GLOBAL_SETTINGS_FILE = this.settingsFileInternal;
    logger.debug(`GLOBAL_SETTINGS_FILE is set to: ${process.env.GLOBAL_SETTINGS_FILE}`);
  }

  /**
   * Sets a home location for the application.
   */
  setHome(): void {
    logger.debug('Setting up the APP_HOME variable.');
    const portableHomePath = path.join(this.getAppDirectory(), '..', '.apic');
    if (fs.existsSync(portableHomePath)) {
      if (this.hasWriteAccess(portableHomePath)) {
        process.env.APP_HOME = portableHomePath;
      } else {
        logger.error(`Insufficient permission to portable APP_HOME "${portableHomePath}".`);
      }
    }
    if (!process.env.APP_HOME) {
      process.env.APP_HOME = app.getPath('userData');
    }
    logger.debug(`APP_HOME is set to: ${process.env.APP_HOME}`);
  }
}
