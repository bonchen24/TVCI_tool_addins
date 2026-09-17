import fs from "node:fs";
import path from "node:path";

test("manifest and task pane entry files exist", () => {
  const root = path.resolve(__dirname, "../..");
  expect(fs.existsSync(path.join(root, "manifest/manifest.xml"))).toBe(true);
  expect(fs.existsSync(path.join(root, "src/taskpane/App.tsx"))).toBe(true);
  expect(fs.existsSync(path.join(root, "src/commands/commands.ts"))).toBe(true);
});
