import { rollupPluginHTML as html } from "@web/rollup-plugin-html";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  output: { dir: "dist" },
  plugins: [
    nodeResolve(),

    typescript({
      tsconfig: "tsconfig.json",
      outputToFilesystem: false,
      // sourceMap: true,
      // module: "esnext",
      // target: "ES2022",
      // moduleResolution: "node",
    }),

    html({
      input: [
        "src/renderer/global/api-client/*.html",
        "src/renderer/global/io/*.html",
        "src/renderer/global/http-project/*.html",
        "src/renderer/global/schema-design/*.html",
        // "src/renderer/global/api-client/TelemetryConsent.html",
        // "src/renderer/global/api-client/Authenticate.html",
        // "src/renderer/global/api-client/Config.html",
        // "src/renderer/global/api-client/Main.html",
      ],
      minify: false,
      flattenOutput: false,
      absoluteBaseUrl: `web-module://api-client.app`,
    }),
  ],
};
