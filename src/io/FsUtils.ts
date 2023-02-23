import { access, constants, readFile, writeFile } from 'fs/promises';

export class FsUtils {
  /**
   * Checks whether the program has access to the location.
   * @param path The path to the location to test
   * @returns True when the program has access to the path.
   */
  static async canRead(path: string): Promise<boolean> {
    try {
      await access(path, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads contents of the `path` as JSON.
   * @param path The path to the JSON file
   * @returns The parsed JSON contents of the file or undefined when invalid JSON or unable to read.
   */
  static async readJson(path: string): Promise<unknown | undefined> {
    if (!await this.canRead(path)) {
      return undefined;
    }
    const raw = await readFile(path, 'utf8');
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch(_) {
      // .
    }
    return data;
  }

  static async writeJson(path: string, content: unknown): Promise<void> {
    const data = JSON.stringify(content);
    await writeFile(path, data, 'utf8');
  }
}
