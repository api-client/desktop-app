import { SchemaDesignerScreen } from '@api-client/ui';
import AppInfo from '@api-client/ui/dist/pages/schema-design/AppInfo.js';
import { ElectronConfigurationBindings } from '../../bindings/ElectronConfigurationBindings.js';
import { ElectronHttpClientStoreBindings } from "../../bindings/ElectronHttpClientStoreBindings.js";
import { ElectronStoreBindings } from '../../bindings/ElectronStoreBindings.js';
import { StoreBaseUri } from '../../Constrains.js';

(async (): Promise<void> => {
  const config = new ElectronConfigurationBindings(AppInfo);
  const idb = new ElectronHttpClientStoreBindings(AppInfo);
  const store = new ElectronStoreBindings(AppInfo, StoreBaseUri);
  const page = new SchemaDesignerScreen({
    store,
    idb,
    config,
  });
  await page.initialize();
})();
