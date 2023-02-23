/* eslint-disable @typescript-eslint/no-unused-vars */
import { NavigationBindings } from "@api-client/ui";
import { INavDetail, INavRunHttpClient, INavRunHttpProjectDetail, INavRunSchemaDesignerDetail } from "@api-client/ui/dist/events/NavigationEvents";

export class ElectronNavigationBindings extends NavigationBindings {
  async openStoreConfiguration(): Promise<void> {
    await globalThis.ipc.navigate.page('/api-client/Config.html');
  }

  async openApiClient(init: INavRunHttpClient = {}): Promise<void> {
    const { space } = init;
    const query: Record<string, string> = {}
    if (space) {
      query.space = space;
    }
    await globalThis.ipc.navigate.page('/api-client/Main.html', query);
  }

  async openHttpProject(init: INavRunHttpProjectDetail): Promise<void> {
    const { space, key } = init;
    if (!space) {
      throw new Error(`Unable to complete navigation. The "space" parameter is required.`);
    }
    if (!key) {
      throw new Error(`Unable to complete navigation. The "key" parameter is required.`);
    }
    await globalThis.ipc.navigate.page('/http-project/HttpProject.html', {
      key,
      space,
    });
  }
  
  async openStoreAuthenticate(init: INavDetail = {}): Promise<void> {
    await globalThis.ipc.navigate.page('/api-client/Authenticate.html');
  }

  async openTelemetry(init: INavDetail = {}): Promise<void> {
    await globalThis.ipc.navigate.page('/api-client/TelemetryConsent.html');
  }

  async openSchemaDesigner(init: INavRunSchemaDesignerDetail): Promise<void> {
    const { key, space } = init;
    await globalThis.ipc.navigate.page('/schema-design/SchemaDesigner.html', {
      key,
      space,
    });
  }
}
