import { 
  AddConfigEnvironmentInit, ConfigurationBindings, EnvironmentConfiguration, 
  IConfigEnvironment, IEnvConfig, ITelemetryConfig, LocalConfiguration, 
  SessionConfiguration, TelemetryConfiguration 
} from '@api-client/ui';

/**
 * Configuration bindings that work in the renderer process.
 */
export class ElectronConfigurationBindings extends ConfigurationBindings {

  local: LocalConfiguration = {
    get: async (key: string): Promise<unknown | undefined> => globalThis.ipc.config.local.get(key),
    set: async (key: string, value: unknown): Promise<void> => globalThis.ipc.config.local.set(key, value),
    delete: async (key: string): Promise<void> => globalThis.ipc.config.local.delete(key),
  }

  session: SessionConfiguration = {
    get: async (key: string): Promise<unknown> => globalThis.ipc.config.session.get(key),
    set: async (key: string, value: unknown): Promise<void> => globalThis.ipc.config.session.set(key, value),
    delete: async (key: string): Promise<void> => globalThis.ipc.config.session.delete(key),
  }

  telemetry: TelemetryConfiguration = {
    read: async (): Promise<ITelemetryConfig> => globalThis.ipc.config.telemetry.read(),
    set: async (config: ITelemetryConfig): Promise<void> => globalThis.ipc.config.telemetry.set(config),
  }

  environment: EnvironmentConfiguration = {
    add: async (env: IConfigEnvironment, init: AddConfigEnvironmentInit = {}): Promise<void> => globalThis.ipc.config.environment.add(env, init),
    update: async (env: IConfigEnvironment): Promise<void> => globalThis.ipc.config.environment.update(env),
    read: async (id?: string): Promise<IConfigEnvironment> => globalThis.ipc.config.environment.read(id),
    remove: async (id: string): Promise<void> => globalThis.ipc.config.environment.remove(id),
    setDefault: async (id: string): Promise<void> => globalThis.ipc.config.environment.setDefault(id),
    list: async (): Promise<IEnvConfig> => globalThis.ipc.config.environment.list(),
  }
}
