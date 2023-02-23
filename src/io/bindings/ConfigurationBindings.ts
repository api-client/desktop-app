/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { 
  AddConfigEnvironmentInit, ConfigBroadcast, EnvironmentConfiguration, 
  IConfigEnvironment, IEnvConfig, ITelemetryConfig, LocalConfiguration, 
  SessionConfiguration, TelemetryConfiguration 
} from "@api-client/ui";
import { ipcMain } from "electron";
import Store from 'electron-store';
import { Broadcast } from "../broadcast/Broadcast.js";
import { ConfigBroadcastChannel, EnvironmentsKey, TelemetryKey } from "../Constants.js";
import { logger } from "../Logger.js";

export class ConfigurationBindings {
  protected localStoreInternal?: Store;
  protected environmentsStoreInternal?: Store;

  get localStore(): Store {
    const { localStoreInternal } = this;
    if (!localStoreInternal) {
      throw new Error(`The configuration bindings are not initialized.`);
    }
    return localStoreInternal;
  }

  get environmentsStore(): Store {
    const { environmentsStoreInternal } = this;
    if (!environmentsStoreInternal) {
      throw new Error(`The configuration bindings are not initialized.`);
    }
    return environmentsStoreInternal;
  }

  sessionStore = new Map<string, unknown>();

  broadcast = new Broadcast(ConfigBroadcastChannel);

  listen(): void {
    this.localStoreInternal = new Store({ name: 'app-local' });
    this.environmentsStoreInternal = new Store({ name: 'store-environments' });
    ipcMain.handle('config-bindings', this.handler.bind(this));
  }

  async handler(event: Electron.IpcMainInvokeEvent, ...args: unknown[]): Promise<unknown> {
    const group = args.splice(0, 1)[0] as string;
    logger.silly(`[IO Config]: Handling configuration event: ${group}, ${args} from window ${event.sender.id}`);

    switch (group) {
      case 'telemetry': return this.handleTelemetry(...args);
      case 'local': return this.handleLocalConfig(...args);
      case 'session': return this.handleSessionConfig(...args);
      case 'environment': return this.handleEnvironmentConfig(...args);
      default: throw new Error(`Unknown command: ${group}`);
    }
  }

  async handleTelemetry(...args: unknown[]): Promise<unknown> {
    const cmd = args[0] as string;

    switch (cmd) {
      case 'read': return this.telemetry.read();
      case 'set': return this.telemetry.set(args[1] as ITelemetryConfig);
      default: throw new Error(`Unknown telemetry command: ${cmd}`);
    }
  }

  async handleLocalConfig(...args: unknown[]): Promise<unknown> {
    const cmd = args[0] as string;

    switch (cmd) {
      case 'get': return this.local.get(args[1] as string);
      case 'set': return this.local.set(args[1] as string, args[2] as unknown);
      case 'delete': return this.local.delete(args[1] as string);
      default: throw new Error(`Unknown local config command: ${cmd}`);
    }
  }

  async handleSessionConfig(...args: unknown[]): Promise<unknown> {
    const cmd = args[0] as string;

    switch (cmd) {
      case 'get': return this.session.get(args[1] as string);
      case 'set': return this.session.set(args[1] as string, args[2] as unknown);
      case 'delete': return this.session.delete(args[1] as string);
      default: throw new Error(`Unknown session config command: ${cmd}`);
    }
  }

  async handleEnvironmentConfig(...args: unknown[]): Promise<unknown> {
    const cmd = args[0] as string;

    switch (cmd) {
      case 'add': return this.environment.add(args[1] as IConfigEnvironment, args[2] as AddConfigEnvironmentInit | undefined);
      case 'update': return this.environment.update(args[1] as IConfigEnvironment);
      case 'read': return this.environment.read(args[1] as string);
      case 'remove': return this.environment.remove(args[1] as string);
      case 'set-default': return this.environment.setDefault(args[1] as string);
      case 'list': return this.environment.list();
      default: throw new Error(`Unknown environment command: ${cmd}`);
    }
  }

  local: LocalConfiguration = {
    /**
     * Reads a previously stored local value.
     * 
     * @param key The key under which the property was stored.
     * @returns The configuration value or undefined when not found.
     */
    get: async (key: string): Promise<unknown | undefined> => {
      if (!key) {
        throw new Error(`Expected a key when reading local config.`);
      }
      const value = this.localStore.get(key);
      return value;
    },

    /**
     * Sets a config property that is permanently stored.
     * 
     * @param key The key under to store the value.
     * @param value The value to store. If this is not a primitive it will be serialized with `JSON.stringify()`.
     */
    set: async (key: string, value: unknown): Promise<void> => {
      if (!key) {
        throw new Error(`Expected a key when reading local config.`);
      }
      this.localStore.set(key, value);
      this.broadcast.postMessage({
        path: 'local.set',
        key,
        value,
      } as ConfigBroadcast);
    },

    /**
     * Deletes previously stored local value.
     * 
     * @param key The key under which the property was stored.
     */
    delete: async (key: string): Promise<void> => {
      if (!key) {
        throw new Error(`Expected a key when deleting local config.`);
      }
      this.localStore.delete(key);
      this.broadcast.postMessage({
        path: 'local.delete',
        key,
      } as ConfigBroadcast);
    }
  }

  session: SessionConfiguration = {
    get: async (key: string): Promise<unknown> => {
      if (!key) {
        throw new Error(`Expected a key when reading session config.`);
      }
      return this.sessionStore.get(key);
    },

    set: async (key: string, value: unknown): Promise<void> => {
      if (!key) {
        throw new Error(`Expected a key when setting session config.`);
      }
      this.sessionStore.set(key, value);
      this.broadcast.postMessage({
        path: 'session.set',
        key,
        value,
      } as ConfigBroadcast);
    },

    delete: async (key: string): Promise<void> => {
      if (!key) {
        throw new Error(`Expected a key when deleting session config.`);
      }
      this.sessionStore.delete(key);
      this.broadcast.postMessage({
        path: 'session.delete',
        key,
      } as ConfigBroadcast);
    }
  }

  telemetry: TelemetryConfiguration = {
    read: async (): Promise<ITelemetryConfig> => {
      let data = this.localStore.get(TelemetryKey) as ITelemetryConfig;
      if (!data) {
        data = {
          level: 'noting',
        };
      }
      return data;
    },

    set: async (config: ITelemetryConfig): Promise<void> => {
      if (!config) {
        throw new Error(`Expected telemetry settings. None given.`);
      }
      this.localStore.set(TelemetryKey, config);
      this.broadcast.postMessage({
        path: 'telemetry.set',
        value: config,
      } as ConfigBroadcast);
    },
  }

  environment: EnvironmentConfiguration = {
    add: async (env: IConfigEnvironment, init: AddConfigEnvironmentInit = {}): Promise<void> => {
      const data = await this.environment.list();
      data.environments.push(env);
      if (init.asDefault) {
        data.current = env.key;
      }
      this.environmentsStore.set(EnvironmentsKey, data);
      this.broadcast.postMessage({
        path: 'environment.add',
        env,
        init,
      } as ConfigBroadcast);
    },

    update: async (env: IConfigEnvironment): Promise<void> => {
      const data = await this.environment.list();
      const index = data.environments.findIndex(i => i.key === env.key);
      if (index < 0) {
        throw new Error(`The environment does not exist. Maybe use "add" instead?`);
      }
      data.environments[index] = env;
      this.environmentsStore.set(EnvironmentsKey, data);
      this.broadcast.postMessage({
        path: 'environment.update',
        env,
      } as ConfigBroadcast);
    },

    read: async (id?: string): Promise<IConfigEnvironment> => {
      const data = await this.environment.list();
      const key = id || data.current;
      if (!key) {
        throw new Error(`No default environment.`);
      }
      const env = data.environments.find(i => i.key === key);
      if (!env) {
        throw new Error(`The environment is not found. Reinitialize application configuration.`);
      }
      return env;
    },

    remove: async (id: string): Promise<void> => {
      const data = await this.environment.list();
      const index = data.environments.findIndex(i => i.key === id);
      if (index >= 0) {
        data.environments.splice(index, 1);
      }
      if (data.current === id) {
        delete data.current;
      }
      this.environmentsStore.set(EnvironmentsKey, data);
      this.broadcast.postMessage({
        path: 'environment.remove',
        id,
      } as ConfigBroadcast);
    },

    setDefault: async (id: string): Promise<void> => {
      const data = await this.environment.list();
      const env = data.environments.find(i => i.key === id);
      if (!env) {
        throw new Error(`The environment is not defined: ${id}`);
      }
      data.current = id;
      this.environmentsStore.set(EnvironmentsKey, data);
      this.broadcast.postMessage({
        path: 'environment.setDefault',
        id,
        env,
      } as ConfigBroadcast);
    },

    list: async (): Promise<IEnvConfig> => {
      let data = this.environmentsStore.get(EnvironmentsKey) as IEnvConfig;
      if (!data) {
        data = {
          environments: [],
        };
      }
      return data;
    }
  }
}

const instance = new ConfigurationBindings();
export default instance;
