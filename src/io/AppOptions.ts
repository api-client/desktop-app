/* eslint-disable @typescript-eslint/ban-ts-comment */
import camelCase from 'camelcase';
import { HTTP_CLIENT_PROTOCOL } from './Constants.js';
import { logger } from './Logger.js';

/**
 * Configuration for an application config option.
 */
interface Option {
  name: string;
  shortcut?: string;
  type: typeof String | typeof Boolean | typeof Number;
}

/**
 * Configuration option after internal processing
 */
interface ProcessedOption extends Option {
  value?: unknown;
  skipNext: boolean;
}

/**
 * When the application was opened from the protocol handler it will
 * have a path that looks like `domain://[source]/[action]/[id]`
 */
export interface ProtocolFile {
  source: string;
  action: string;
  id: string;
}

export interface AppGlobalConfig {
  /**
   * The path to the settings file.
   * Default to the application working folder.
   */
  settingsFile?: string;
  /**
   * Whether the application should be opened in the dev mode.
   */
  dev?: boolean;
  /**
   * Application debug level.
   */
  debugLevel?: 'debug' | 'error' | 'info' | 'silly' | 'verbose' | 'warn';
  /**
   * Whether the browser window should have developer tools opened.
   */
  withDevtools?: boolean;
  // this is for development purposes only
  port?: number;
  /**
   * When set it prohibits the application from auto update.
   */
  skipAppUpdate?: boolean;
  /**
   * Sets the application data directory.
   */
  appDataDir?: string;
  /**
   * The protocol file to open.
   */
  openProtocolFile?: ProtocolFile;
  /**
   * When set it does not show the telemetry consent dialog.
   */
  skipTelemetry?: boolean;
  /**
   * The proxy to apply to the application.
   * By default the proxy is applied to the requests only. When the `proxyAll`
   * property is set then it also applies the proxy settings to the UIs and the main process.
   * 
   * It is the URL of the proxy server, e.g.:
   * 192.168.1.1:8118
   */
  proxy?: string;
  /**
   * Optional username for the proxy.
   */
  proxyUsername?: string;
  /**
   * Optional password for the proxy.
   */
  proxyPassword?: string;
  /**
   * Works as an additional option for `proxy`. When set is applies proxy to the 
   * application main process and the UIs.
   */
  proxyAll?: boolean;
  /**
   * When set it detects OS' proxy settings and applies them to the 
   * requests/application.
   */
  proxySystemSettings?: boolean;
}

/**
   * List of command line options with mapping to properties.
   *
   * The list of app config options
   */
const availableOptions: Option[] = [
  {
    name: '--settings-file',
    shortcut: '-s',
    type: String
  },
  {
    name: '--dev',
    shortcut: '-d',
    type: Boolean
  }, 
  {
    name: '--debug-level',
    shortcut: '-l',
    type: String
  }, 
  {
    name: '--with-devtools',
    shortcut: '-w',
    type: Boolean
  }, 
  {
    name: '.', // from "npm start" to not print errors
    shortcut: '-dot',
    type: String
  }, 
  {
    name: '--port',
    shortcut: '-p',
    type: Number
  },
  {
    // Skips application update check for this run
    name: '--skip-app-update',
    shortcut: '-u',
    type: Boolean,
  }, 
  {
    name: '--app-data-dir',
    shortcut: '-D',
    type: String,
  }, 
  {
    name: '--skip-telemetry',
    type: Boolean,
  },
  {
    // the proxy URL.
    name: '--proxy',
    type: String,
  },
  {
    // optional proxy username
    name: '--proxy-username',
    type: String,
  },
  {
    // proxy password
    name: '--proxy-password',
    type: String,
  },
  {
    // when set it applies proxy system settings
    name: '--proxy-system-settings',
    type: Boolean,
  },
  {
    // when set it applies proxy configuration to the entire application,
    // not only to the HTTP requests. This influences telemetry and updates.
    name: '--proxy-all',
    type: Boolean,
  },
];

/**
 * A class describing and processing application initial options.
 *
 * All options are camel cased before setting it to as a property
 * of this class.
 * Use `getOptions` to create an object with configuration.
 */
export class AppOptions {
  protected map: AppGlobalConfig = {};

  /**
   * Produces list of startup options.
   * @returns A map of configured options.
   */
  getOptions(): AppGlobalConfig {
    return { ...this.map };
  }

  /**
   * Parses startup options.
   */
  parse(): void {
    for (let i = 1; i < process.argv.length; i++) {
      const arg = process.argv[i];
      if (arg[0] !== '-') {
        if (this.isDefaultHttpClientProtocolFile(arg)) {
          this.setHttpClientDefaultProtocolFile(arg);
        } else if (arg[0] !== '.') {
          logger.warn(`Unknown startup option ${arg}`);
        }
        continue;
      }
      const definition = this.findDefinition(arg);
      if (!definition) {
        logger.warn(`Unknown startup option ${arg}`);
        continue;
      }
      const processedDefinition = this.getPropertyDefinition(arg, definition, process.argv[i + 1]);
      this.setProperty(processedDefinition);
      if (processedDefinition.skipNext) {
        i++;
      }
    }
  }

  /**
   * Checks if the argument is default protocol file argument added to the
   * program's options by the OS.
   * @param arg Argument to test
   * @returns True if passed argument represent default protocol file.
   */
  isDefaultHttpClientProtocolFile(arg: string): boolean {
    return !!(arg && arg.indexOf(`${HTTP_CLIENT_PROTOCOL}://`) === 0);
  }

  /**
   * Sets the `openProtocolFile` property with passed file path information.
   * 
   * The `source` property represents file source (like google-drive).
   * The `action` property represent an action to take (like `open` or `create`).
   * The `id` property if the file identifier.
   * 
   * @param url Default protocol file.
   */
  setHttpClientDefaultProtocolFile(url: string): void {
    const fileData = url.substring(HTTP_CLIENT_PROTOCOL.length + 3);
    const parts = fileData.split('/');
    switch (parts[0]) {
      case 'drive':
        // http-client://drive/open/file-id
        // http-client://drive/create/file-id
        this.map.openProtocolFile = {
          source: 'google-drive',
          action: parts[1],
          id: parts[2]
        };
        break;
      default:
    }
  }

  /**
   * Finds an option definition from an argument.
   *
   * @param arg Argument passed to the application.
   * @returns Option definition or undefined if not found.
   */
  findDefinition(arg: string): Option | undefined {
    let value = arg;
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      value = value.substring(0, eqIndex);
    }
    if (value.indexOf('--') === 0) {
      return availableOptions.find((item) => item.name === value);
    }
    if (value.indexOf('-') === 0) {
      return availableOptions.find((item) => item.shortcut === value);
    }
    return undefined;
  }

  /**
   * Updates definition object with `value` and `skipNext` properties.
   *
   * @param arg Command line argument
   * @param def Existing command definition.
   * @param nextValue Next item in the arguments array.
   * @returns Updated `def` object.
   */
  getPropertyDefinition(arg: string, def: Option, nextValue?: string): ProcessedOption {
    const result = { ...def, skipNext: false } as ProcessedOption;
    if (result.type === Boolean) {
      result.value = true;
      return result;
    }
    let value;
    if (arg.indexOf('=') !== -1) {
      value = this.getArgValue(arg);
    } else {
      value = nextValue;
      result.skipNext = true;
    }
    if (result.type === Number) {
      result.value = Number(value);
    } else {
      result.value = value;
    }
    return result;
  }

  /**
   * Gets a value from an argument line when value is passed as
   * `arg="value"` or `arg=value`
   *
   * @param arg The argument pice
   * @returns The value for the argument.
   */
  getArgValue(arg: string): string {
    const index = arg.indexOf('=');
    if (index === -1) {
      return '';
    }
    let value = arg.substring(index + 1);
    if (value[0] === '"') {
      value = value.substring(1);
      value = value.substring(0, value.length - 1);
    }
    return value;
  }

  /**
   * Sets a property value on this object.
   * An option name is set as a property after it's camel cased.
   *
   * @param def Command definition.
   */
  setProperty(def: ProcessedOption): void {
    const { map } = this;
    const name = camelCase(def.name) as keyof AppGlobalConfig;
    // @ts-ignore
    map[name] = def.value as string | number | boolean | undefined;
  }
}

const startupOptions = new AppOptions();
startupOptions.parse();
const initOptions = startupOptions.getOptions();

export default initOptions;
