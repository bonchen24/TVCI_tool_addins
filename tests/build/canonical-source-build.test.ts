describe("canonical production source build", () => {
  it("uses the canonical Office entry files and excludes fixed copies from static assets", async () => {
    const webpackConfigFactory = require("../../webpack.config.js") as (
      env: unknown,
      argv: { mode: string },
    ) => Promise<{ entry: Record<string, string>; plugins: Array<{ constructor: { name: string }; patterns?: Array<Record<string, unknown>> }> }>;
    const config = await webpackConfigFactory({}, { mode: "production" });

    expect(config.entry).toEqual({
      taskpane: "./src/taskpane/index.tsx",
      dialog: "./src/dialog/index.tsx",
      commands: "./src/commands/commands.ts",
    });

    const copyPlugin = config.plugins.find((plugin) => plugin.constructor.name === "CopyPlugin");
    expect(copyPlugin?.patterns).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: "templates",
        globOptions: { ignore: ["**/*.fixed.*", "**/canonical/**"] },
      }),
    ]));
  });

  it("uses the default webpack config for production build and installer packaging", () => {
    const packageJson = require("../../package.json") as { scripts: Record<string, string> };
    const packageInstaller = require("node:fs").readFileSync("scripts/package-installer.mjs", "utf8") as string;

    expect(packageJson.scripts.build).toBe("webpack --mode production");
    expect(packageInstaller).toContain("'run', 'build'");
    expect(packageInstaller).not.toContain("webpack.codex-fix.config.js");
  });
});
