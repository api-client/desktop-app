/* eslint-disable @typescript-eslint/no-unused-vars */
import { 
  ContextChangeRecord, 
  ContextDeleteRecord, 
  IQueryResponse, 
  IRequestUiMeta, 
  IUrl, 
  IBulkOperationResult
} from "@api-client/core/build/browser.js";
import { HttpClientStoreBindings, HttpClientIdbDatabase } from "@api-client/ui";


/**
 * HTTP Client's specific data (URL history, UI state, etc).
 */
export class ElectronHttpClientStoreBindings extends HttpClientStoreBindings {
  store = new HttpClientIdbDatabase();

  override async initialize(): Promise<void> {
    await super.initialize();
    await this.initializeStore();
  }

  async initializeStore(): Promise<void> {
    await this.store.initialize();
  }

  wsHistory = {
    add: (url: string): Promise<IUrl> => {
      return this.store.wsHistory.add(url);
    },
    query: (query: string): Promise<IQueryResponse<IUrl>> => this.store.wsHistory.query(query),
    delete: (url: string): Promise<ContextDeleteRecord> => this.store.wsHistory.delete(url),
    clear: (): Promise<void> => this.store.wsHistory.clear(),
  }

  urlHistory = {
    add: (url: string): Promise<IUrl> => this.store.urlHistory.add(url),
    query: (query: string): Promise<IQueryResponse<IUrl>> => this.store.urlHistory.query(query),
    delete: (url: string): Promise<ContextDeleteRecord> => this.store.urlHistory.delete(url),
    clear: (): Promise<void> => this.store.urlHistory.clear(),
  }

  projectUi = {
    clear: (key: string): Promise<ContextDeleteRecord> => this.store.projectUi.clear(key),
    set: (pid: string, key: string, meta: IRequestUiMeta): Promise<ContextChangeRecord<IRequestUiMeta>> => this.store.projectUi.set(pid, key, meta),
    get: (pid: string, key: string): Promise<IRequestUiMeta | undefined> => this.store.projectUi.get(pid, key),
    getBulk: (pid: string, keys: string[]): Promise<IBulkOperationResult<IRequestUiMeta>> => this.store.projectUi.getBulk(pid, keys),
    delete: (pid: string, key: string): Promise<ContextDeleteRecord> => this.store.projectUi.delete(pid, key),
  }
}
