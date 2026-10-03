import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

function resolveTypeScriptPath(filePath) {
  const requested = filePath instanceof URL ? fileURLToPath(filePath) : filePath;
  const resolved = path.resolve(requested);
  const candidates = path.extname(resolved)
    ? [resolved]
    : [`${resolved}.ts`, `${resolved}.tsx`, `${resolved}.js`, path.join(resolved, "index.ts")];
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) throw new Error(`Cannot resolve TypeScript module: ${requested}`);
  return match;
}

export function loadTypeScriptModule(filePath) {
  const resolvedPath = resolveTypeScriptPath(filePath);
  const cached = moduleCache.get(resolvedPath);
  if (cached) return cached.exports;

  const loaded = { exports: {} };
  moduleCache.set(resolvedPath, loaded);
  const source = fs.readFileSync(resolvedPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.startsWith(".")) {
      return loadTypeScriptModule(path.resolve(path.dirname(resolvedPath), specifier));
    }
    return require(specifier);
  };

  new Function("require", "module", "exports", output)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
