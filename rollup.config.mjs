import { rollupPluginHTML as html } from "@web/rollup-plugin-html";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import css from "rollup-plugin-import-css";

/** @typedef {import('rollup').RollupOptions} RollupOptions */

export default /** @type RollupOptions[] */ ([
  // The app
  {
    output: {
      dir: "dist",
    },
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
        ],
        minify: false,
        flattenOutput: false,
        absoluteBaseUrl: `web-module://api-client.app`,
      }),

      css(),
    ],
  },
  // monaco
  {
    input: {
      // monaco: "src/renderer/global/monaco/monaco.js",
      "editor.worker": "monaco-editor/esm/vs/editor/editor.worker.js",
      "json.worker": "monaco-editor/esm/vs/language/json/json.worker",
      "css.worker": "monaco-editor/esm/vs/language/css/css.worker",
      "html.worker": "monaco-editor/esm/vs/language/html/html.worker",
      "ts.worker": "monaco-editor/esm/vs/language/typescript/ts.worker",
    },

    output: {
      dir: "dist/monaco/",
      format: "esm",
    },

    plugins: [nodeResolve(), css()],
  },
]);
