import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf8"));

test("webpack TypeScript config permits emit while typecheck command owns noEmit", () => {
  assert.notEqual(tsconfig.compilerOptions?.noEmit, true, "tsconfig noEmit=true prevents ts-loader from emitting JavaScript");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.match(pkg.scripts?.typecheck ?? "", /tsc\s+--noEmit/);
});

test("webpack forces TypeScript emit at the ts-loader boundary", () => {
  const webpackConfig = fs.readFileSync("webpack.config.js", "utf8");
  assert.match(webpackConfig, /loader:\s*["']ts-loader["']/);
  assert.match(webpackConfig, /compilerOptions\s*:\s*\{[\s\S]*?noEmit\s*:\s*false[\s\S]*?\}/);
});

test("production webpack config does not initialize localhost dev certificates", async () => {
  const webpackConfigFactory = require("../webpack.config.js") as (
    env: unknown,
    argv: { mode: string },
  ) => Promise<{ devServer?: unknown }>;
  const productionConfig = await webpackConfigFactory({}, { mode: "production" });
  assert.equal(productionConfig.devServer, undefined);
});

test("development server does not inject a websocket client into the Word task pane", () => {
  const webpackConfig = fs.readFileSync("webpack.config.js", "utf8");
  assert.match(webpackConfig, /hot:\s*false/);
  assert.match(webpackConfig, /client:\s*false/);
  assert.match(webpackConfig, /host:\s*["']localhost["']/);
});

test("development HTTPS host can reuse an existing certificate when installer cannot rewrite it", () => {
  const webpackConfig = fs.readFileSync("webpack.config.js", "utf8");
  assert.match(webpackConfig, /office-addin-dev-certs/);
  assert.match(webpackConfig, /\.office-addin-dev-certs/);
  assert.match(webpackConfig, /readFileSync/);
});
