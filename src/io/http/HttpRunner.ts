import type * as Core from '@api-client/core';

function unhandledRejection(): void {
  // 
}

export class HttpRunner {
  constructor(protected coreLibrary: typeof Core) {
  }

  project = {
    serial: async (project: Core.HttpProject, opts: Core.IProjectRunnerOptions): Promise<Core.IProjectExecutionLog> => {
      const factory = new this.coreLibrary.ProjectSerialRunner();
      factory.configure(project, opts);

      process.on('unhandledRejection', unhandledRejection);
      const report = await factory.execute();
      process.off('unhandledRejection', unhandledRejection);
      return report;
    },

    parallel: async (project: Core.HttpProject, opts: Core.IProjectRunnerOptions): Promise<Core.IProjectExecutionLog> => {
      const factory = new this.coreLibrary.ProjectParallelRunner(project, opts);
      process.on('unhandledRejection', unhandledRejection);
      const report = await factory.execute();
      process.off('unhandledRejection', unhandledRejection);
      return report;
    }
  }
}
