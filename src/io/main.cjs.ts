const shellStartTime = Date.now();

/* eslint-disable @typescript-eslint/no-var-requires */
if (process.env.NODE_ENV !== 'test') {
  try {
    require('electron-reloader')(module, {
      ignore: ['src']
    });
  } catch (_) {
    // ...
  }
}
const app = require("esm")(module)('./ApiClient.process.js');
const instance = new app.ApiClientProcess(shellStartTime)
instance.run();
