import { app, protocol } from "electron";
import * as path from 'path';
import initOptions from "./AppOptions.js";
import { AppPaths } from "./AppPaths.js";
import { HTTP_CLIENT_PROTOCOL, RENDERER_PROTOCOL } from "./Constants.js";
import { logger, setLevel } from './Logger.js';
import { TelemetryConsent } from "./windows/TelemetryConsent.js";
import { EsmProtocol } from './EsmProtocol.js';
import config from "./bindings/ConfigurationBindings.js";
import { FileBindings } from "./bindings/FileBindings.js";
import { BroadcastWindow } from "./windows/BroadcastWindow.js";
import { StoreConfig } from "./windows/StoreConfig.js";
import appWindows from "./windows/AppWindows.js";
import { AppClientStart } from "./windows/AppClientStart.js";
import { NavigationBindings } from "./bindings/NavigationBindings.js";
import { ProxyBindings } from "./bindings/ProxyBindings.js";

/**
 * A class that is exported to the `CJS` world that initializes the main 
 * application process.
 * 
 * Note, because Electron insist on not supporting ESM all libraries
 * that are purely written in ESM must be imported before `esm` module imports this class.
 * 
 * Nothing from this point can import the core or a new store libraries, unless in a separate process.
 */
export class ApiClientProcess {
  constructor(public shellStartTime: number) {
  }

  async run(): Promise<void> {
    this.setupElectronAppSwitches();
    this.setupVersion();
    this.setupUncaughtHandlers();
    this.setupLogger();
    logger.silly('Welcome to the API Client world.');
    this.setupUserData();
    this.registerPrivilegedSchema();
    logger.debug('Setting up the environment');
    this.setupApplicationPats();
    this.setupWindowsUserModelId();
    this.setupDefaultProtocol();

    logger.debug('Waiting for the app to initialize...');
    await app.whenReady();
    logger.debug('App initialized. Continuing setup.');
    logger.debug(`Electron ready time: ${Date.now() - this.shellStartTime}ms`);

    this.setupApiClientProtocol();
    await this.setupBroadcastChannel();
    this.setupConfiguration();
    this.setupFilesSupport();
    this.setupNavigation();
    await this.setupHttpProxy();

    // we are entering first run flow here.
    appWindows.ignoreQuit = true;
    await this.setupTelemetry();
    await this.setupStoreEnvironment();
    await this.setupStoreAuthenticate();
    appWindows.ignoreQuit = false;

    // It is time to show the main window.
    await this.startMain();
  }

  protected setupElectronAppSwitches(): void {
    app.commandLine.appendSwitch('enable-experimental-web-platform-features');
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  }

  protected setupVersion(): void {
    // Sets the application version in a global variable so the renderer process 
    // has this information without querying for it.
    process.env.APP_VERSION = app.getVersion();
  }

  protected setupUncaughtHandlers(): void {
    process.on('uncaughtException', this.handleUncaught.bind(this));
    process.on('unhandledRejection', this.handleUncaught.bind(this));
  }

  protected handleUncaught(error: Error): void {
    if (error.message) {
      logger.error(error.message);
    }
    if (error.stack) {
      logger.error(error.stack);
    }
  }

  protected setupLogger(): void {
    if (initOptions.dev) {
      setLevel(initOptions.debugLevel || 'silly');
    } else if (initOptions.debugLevel) {
      setLevel(initOptions.debugLevel);
    } else {
      setLevel('error');
    }
  }

  protected setupUserData(): void {
    if (initOptions.appDataDir) {
      logger.debug(`Setting the "userData" path to the configured ${initOptions.appDataDir})}...`);
      app.setPath('userData', initOptions.appDataDir);
    } else if (initOptions.dev) {
      const appData = app.getPath('appData');
      const newPath = path.join(appData, 'api-client-dev');
      logger.debug(`Setting the "userData" path to ${newPath} due to the "dev" option.`);
      app.setPath('userData', newPath);
    }
  }

  protected registerPrivilegedSchema(): void {
    logger.debug(`Registering the "${RENDERER_PROTOCOL}" scheme as privileged.`);
    protocol.registerSchemesAsPrivileged([
      { scheme: RENDERER_PROTOCOL, privileges: { standard: true, secure: true, allowServiceWorkers: true, bypassCSP: true } }
    ]);
  }

  protected setupApplicationPats(): void {
    const appPaths = new AppPaths();
    appPaths.setHome();
    appPaths.setSettingsFile(initOptions.settingsFile);

    // Overrides initial user path to processed by the AppPaths
    initOptions.settingsFile = appPaths.settingsFile;
  }

  protected setupWindowsUserModelId(): void {
    logger.debug('Setting up the application user model id');
    // This prevents Win10 from showing dupe items in the taskbar
    app.setAppUserModelId(`com.squirrel.api-client.${process.arch}`);
  }

  protected setupDefaultProtocol(): void {
    const protocolResult = app.setAsDefaultProtocolClient(HTTP_CLIENT_PROTOCOL);
    if (protocolResult) {
      logger.debug(`Registered "${HTTP_CLIENT_PROTOCOL}" protocol`);
    } else {
      logger.warn(`Unable to register "${HTTP_CLIENT_PROTOCOL}" protocol`);
    }
  }

  protected setupApiClientProtocol(): void {
    logger.debug('Initializing the WebModules protocol');
    const mp = new EsmProtocol();
    mp.register();
  }

  protected async setupBroadcastChannel(): Promise<void> {
    logger.debug(`Initializing broadcast bindings`);
    const broadcast = new BroadcastWindow();
    await broadcast.initialize();
  }

  protected setupConfiguration(): void {
    logger.debug(`Initializing configuration bindings`);
    config.listen();
  }

  protected setupFilesSupport(): void {
    logger.debug(`Initializing file bindings`);
    const file = new FileBindings();
    file.listen();
  }

  protected async setupTelemetry(): Promise<void> {
    logger.debug('Checking if telemetry should skip.');
    if (!initOptions.skipTelemetry) {
      const telemetry = new TelemetryConsent();
      await telemetry.run();
    } else {
      logger.debug('Skipped.');
    }
  }
  protected async setupStoreEnvironment(): Promise<void> {
    logger.debug('Checking if store is configured.');
    if (await StoreConfig.shouldInitRun()) {
      logger.debug('Opening store configuration screen.');
      const configScreen = new StoreConfig();
      await configScreen.runConfig();
    } else {
      logger.debug('The store configuration is OK.');
    }
  }

  protected async setupStoreAuthenticate(): Promise<void> {
    logger.debug('Checking if store is authenticated.');
    // when this is called we know we have a valid configuration.
    const env = await config.environment.read();
    if (!env) {
      throw new Error(`Invalid state. The application should have a valid store configuration but it is not.`);
    }
    if (env.authenticated) {
      logger.debug('The store authenticated status is OK.');
      return;
    }
    logger.debug('Opening authentication page.');
    const configScreen = new StoreConfig();
    await configScreen.runAuthenticate();
  }

  protected async startMain(): Promise<void> {
    const instance = new AppClientStart();
    await instance.run();
  }

  protected setupNavigation(): void {
    logger.debug(`Initializing navigation bindings`);
    const file = new NavigationBindings();
    file.listen();
  }

  protected async setupHttpProxy(): Promise<void> {
    logger.debug(`Initializing http proxy`);
    const file = new ProxyBindings();
    await file.initialize();
  }
}
