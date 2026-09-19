import fs from "node:fs";
import path from "node:path";

test("manifest and task pane entry files exist", () => {
  const root = path.resolve(__dirname, "../..");
  expect(fs.existsSync(path.join(root, "manifest/manifest.xml"))).toBe(true);
  expect(fs.existsSync(path.join(root, "src/taskpane/App.tsx"))).toBe(true);
  expect(fs.existsSync(path.join(root, "src/commands/commands.ts"))).toBe(true);
});

test("manifest strings do not contain mojibake or corrupted encoding", () => {
  const root = path.resolve(__dirname, "../..");
  const manifestContent = fs.readFileSync(path.join(root, "manifest/manifest.xml"), "utf8");
  const strRegex = /<bt:String id="([^"]+)" DefaultValue="([^"]+)"\/>/g;
  let match: RegExpExecArray | null;
  const corrupted: string[] = [];

  while ((match = strRegex.exec(manifestContent)) !== null) {
    const id = match[1];
    const val = match[2];
    if (
      /[ÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]{2,}/.test(val) ||
      /\?[a-z]|\b[a-z]\?/i.test(val) ||
      /\uFFFD/.test(val)
    ) {
      corrupted.push(`${id}: "${val}"`);
    }
  }

  expect(corrupted).toEqual([]);
});
