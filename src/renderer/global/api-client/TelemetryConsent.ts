import { TelemetryScreen } from '@api-client/ui';
import AppInfo from '@api-client/ui/dist/pages/api-client/AppInfo.js';
import { ElectronConfigurationBindings } from '../../bindings/ElectronConfigurationBindings.js';
import { ElectronStoreBindings } from '../../bindings/ElectronStoreBindings.js';
import { StoreBaseUri } from '../../Constrains.js';

(async (): Promise<void> => {
  const config = new ElectronConfigurationBindings(AppInfo);
  const store = new ElectronStoreBindings(AppInfo, StoreBaseUri);
  const page = new TelemetryScreen({ config, store });
  await page.initialize();
  await page.initializeConfig();
  page.render();
})();
