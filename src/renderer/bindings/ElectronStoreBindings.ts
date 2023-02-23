import { IApplication, IBackendInfo, uuidV4 } from "@api-client/core/build/browser.js";
import { EnvironmentSettings, EnvironmentsKey, Events, IConfigEnvironment, IConfigInit, StoreBindings } from "@api-client/ui";
import { HttpStore } from "@api-client/ui/dist/store/HttpStore.js";

export class ElectronStoreBindings extends StoreBindings {
  /**
   * The base URI of the "local" store to be used when the user chooses 
   * the local store over the net store.
   */
  storeBaseUri: string;

  /**
   * @param storeBaseUri The base URI of the "local" store to be used when the user chooses 
   * the local store over the 
   */
  constructor(app: IApplication, storeBaseUri: string) {
    super(app);
    this.storeBaseUri = storeBaseUri;
  }

  environment: EnvironmentSettings = {
    init: async (init: IConfigInit): Promise<void> => {
      const { reason, source, asDefault, location, name = 'New store' } = init;
      const isLocal = init.source === 'local-store';
      if (!isLocal && !location) {
        throw new Error(`Store location is required when adding a network store.`);
      }
      if (isLocal && !this.storeBaseUri) {
        throw new Error(`The application is not correctly configured. Local store location is not set.`);
      }
      
      const env: IConfigEnvironment = {
        key: uuidV4(),
        location: isLocal ? this.storeBaseUri : location as string,
        name,
        source,
        authenticated: false,
      };

      const store = new HttpStore(env);
      const info = await store.sdk.store.getInfo();
      const setDefault = reason === 'first-run' || !!asDefault;

      if (info.mode === 'single-user') {
        // this store does not require authentication but does require setting up 
        // a session.
        await store.getStoreSessionToken(env);
        // this event is handled by the application controller 
        // and redirects the user to the next step.
        await Events.Config.Environment.add(env, setDefault);
      } else if (reason === 'first-run') {
        // the store needs authentication. We redirect the user to the 
        // authentication screen.
        await Events.Config.Session.set(`${EnvironmentsKey}.creating`, env);
        Events.Navigation.Store.authenticate({ sameWindow: true })
      } else if (reason === 'add') {
        // this is adding an environment from the configuration screen.
        // We save the configuration in the store.
        await Events.Config.Environment.add(env, setDefault);
      }
    },

    readStoreInfo: async (baseUri: string): Promise<IBackendInfo> => {
      const store = new HttpStore(baseUri);
      return store.sdk.store.getInfo();
    }
  }
}
