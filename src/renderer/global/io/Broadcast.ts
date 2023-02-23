import AppInfo from '@api-client/ui/dist/pages/api-client/AppInfo.js';
import { ElectronBroadcastBindings } from "../../bindings/ElectronBroadcastBindings.js"

(async (): Promise<void> => {
  const binding = new ElectronBroadcastBindings(AppInfo);
  await binding.initialize();
})()
