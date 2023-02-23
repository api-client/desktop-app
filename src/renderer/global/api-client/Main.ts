import { ApiClientStartScreen } from "@api-client/ui";
import AppInfo from '@api-client/ui/dist/pages/api-client/AppInfo.js';
import { ElectronConfigurationBindings } from '../../bindings/ElectronConfigurationBindings.js';
import { ElectronFileBindings } from "../../bindings/ElectronFileBindings.js";
import { ElectronHttpClientStoreBindings } from "../../bindings/ElectronHttpClientStoreBindings.js";
import { ElectronNavigationBindings } from "../../bindings/ElectronNavigationBindings.js";
import { ElectronStoreBindings } from '../../bindings/ElectronStoreBindings.js';
import { StoreBaseUri } from "../../Constrains.js";

(async (): Promise<void> => {
  const idb = new ElectronHttpClientStoreBindings(AppInfo);
  const store = new ElectronStoreBindings(AppInfo, StoreBaseUri);
  const config = new ElectronConfigurationBindings(AppInfo);
  const navigation = new ElectronNavigationBindings(AppInfo);
  const files = new ElectronFileBindings(AppInfo);

  const page = new ApiClientStartScreen({
    idb,
    store,
    config,
    navigation,
    files,
  });
  await page.initialize();
})();
