/* eslint-disable @typescript-eslint/no-unused-vars */
import { 
  ContextChangeRecord, ContextDeleteRecord, 
  IQueryResponse, 
  IRequestUiMeta, IUrl, IBulkOperationResult} from "@api-client/core/build/browser.js";
import { HttpClientStoreBindings } from "@api-client/ui";


/**
 * HTTP Client's specific data (URL history, UI state, etc).
 */
export class ElectronHttpClientStoreBindings extends HttpClientStoreBindings {
  async initializeStore(): Promise<void> {
    // ...
  }

  wsHistory = {
    add: (url: string): Promise<IUrl> => {
      throw new Error(`Not yet implemented`);
    },
    query: (query: string): Promise<IQueryResponse<IUrl>> => {
      throw new Error(`Not yet implemented`);
    },
    delete: (url: string): Promise<ContextDeleteRecord> => {
      throw new Error(`Not yet implemented`);
    },
    clear: (): Promise<void> => {
      throw new Error(`Not yet implemented`);
    },
  }

  urlHistory = {
    add: (url: string): Promise<IUrl> => {
      throw new Error(`Not yet implemented`);
    },
    query: (query: string): Promise<IQueryResponse<IUrl>> => {
      throw new Error(`Not yet implemented`);
    },
    delete: (url: string): Promise<ContextDeleteRecord> => {
      throw new Error(`Not yet implemented`);
    },
    clear: (): Promise<void> => {
      throw new Error(`Not yet implemented`);
    },
  }

  projectUi = {
    clear: (key: string): Promise<ContextDeleteRecord> => {
      throw new Error(`Not yet implemented`);
    },
    set: (pid: string, key: string, meta: IRequestUiMeta): Promise<ContextChangeRecord<IRequestUiMeta>> => {
      throw new Error(`Not yet implemented`);
    },
    get: (pid: string, key: string): Promise<IRequestUiMeta | undefined> => {
      throw new Error(`Not yet implemented`);
    },
    getBulk: (pid: string, keys: string[]): Promise<IBulkOperationResult<IRequestUiMeta>> => {
      throw new Error(`Not yet implemented`);
    },
    delete: (pid: string, key: string): Promise<ContextDeleteRecord> => {
      throw new Error(`Not yet implemented`);
    },
  }
}
