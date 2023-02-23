import { ConfigBroadcast, ConfigBroadcastChannel, PlatformBindings } from "@api-client/ui";
import type { IpcRendererEvent } from "electron";

export class ElectronBroadcastBindings extends PlatformBindings {
  
  config = new BroadcastChannel(ConfigBroadcastChannel);

  async initialize(): Promise<void> {
    globalThis.logger.debug(`Initializing the ElectronBroadcastBindings with channel: ${ConfigBroadcastChannel}`);
    globalThis.ipc.handleConfig(ConfigBroadcastChannel, this.handleConfig.bind(this));
    globalThis.logger.debug(`Initialized the ElectronBroadcastBindings`);
  }

  protected handleConfig(event: IpcRendererEvent, message: ConfigBroadcast): void {
    globalThis.logger.debug(`Received a broadcast event. Retargeting to a BroadcastChannel. ${message}`);
    this.config.postMessage(message);
  } 
}
