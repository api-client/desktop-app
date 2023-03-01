import { HttpProjectScreen } from '@api-client/ui';
import AppInfo from '@api-client/ui/dist/pages/http-project/AppInfo.js';
import { ElectronConfigurationBindings } from '../../bindings/ElectronConfigurationBindings.js';
import { ElectronHttpClientStoreBindings } from "../../bindings/ElectronHttpClientStoreBindings.js";
import { ElectronNavigationBindings } from "../../bindings/ElectronNavigationBindings.js";
import { ElectronProxyBindings } from '../../bindings/ElectronProxyBindings.js';
import { ElectronStoreBindings } from '../../bindings/ElectronStoreBindings.js';
import { StoreBaseUri } from '../../Constrains.js';
import '../monaco/monaco.js';

(async (): Promise<void> => {
  // const base = `../../../node_modules/monaco-editor/`;
  // MonacoLoader.createEnvironment(base);
  // await MonacoLoader.loadMonaco(base);
  // await MonacoLoader.monacoReady();

  const navigation = new ElectronNavigationBindings(AppInfo);
  const proxy = new ElectronProxyBindings(AppInfo);
  const config = new ElectronConfigurationBindings(AppInfo);

  const idb = new ElectronHttpClientStoreBindings(AppInfo);
  const store = new ElectronStoreBindings(AppInfo, StoreBaseUri);
  const page = new HttpProjectScreen({
    store,
    proxy,
    idb,
    config,
    navigation,
  });
  await page.initialize();
})();
