// Bundles markdown-it-cjk-friendly (an ES module with one dependency) into a
// classic script for vendor/, so the app keeps working offline without a
// module loader. Run with: npm run vendor:cjk
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("node_modules/markdown-it-cjk-friendly/package.json", "utf8"));
const { version: widthVersion } = JSON.parse(readFileSync("node_modules/get-east-asian-width/package.json", "utf8"));

await build({
  stdin: {
    contents: 'import plugin from "markdown-it-cjk-friendly"; window.markdownitCjkFriendly = plugin;',
    resolveDir: process.cwd()
  },
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  legalComments: "none",
  banner: {
    js: `/*! markdown-it-cjk-friendly ${version} https://github.com/tats-u/markdown-cjk-friendly @license MIT */\n`
      + `/*! get-east-asian-width ${widthVersion} https://github.com/sindresorhus/get-east-asian-width @license MIT */`
  },
  outfile: "vendor/markdown-it/markdown-it-cjk-friendly.min.js"
});
