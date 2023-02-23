import { FsUtils } from "./FsUtils.js";

class GlobalSettings {
  /**
   * The settings file location.
   */
  get file(): string {
    return process.env.GLOBAL_SETTINGS_FILE as string
  }

  contents?: unknown;

  async read(): Promise<unknown> {
    let { contents } = this;
    if (!contents) {
      contents = await FsUtils.readJson(this.file);
    }
    if (!contents) {
      contents = {};
      this.contents = {};
    }
    return contents;
  }

  async write(): Promise<void> {
    const { contents = {} } = this;
    await FsUtils.writeJson(this.file, contents);
  }
}

const settings = new GlobalSettings();
export default settings;
