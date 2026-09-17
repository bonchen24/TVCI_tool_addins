import test from "node:test";
import assert from "node:assert/strict";
import { loadTemplatePreferences, saveTemplatePreferences } from "../src/templates/preferences.ts";

test("template preferences round-trip through storage compatible API", () => {
  const map = new Map<string,string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
  };
  const prefs = { a: { hidden: true, isDefault: false, sortOrder: 3 } };
  saveTemplatePreferences(prefs, storage);
  assert.deepEqual(loadTemplatePreferences(storage), prefs);
});
