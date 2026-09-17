import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

const REQUIRED_FILES = [
  "package.json",
  "package-lock.json",
  "webpack.config.js",
  "tsconfig.json",
  "setup.cmd",
  "repair.cmd",
  "uninstall.cmd",
];

const REQUIRED_DIRECTORIES = ["manifest", "src", "assets", "templates"];
const LIFECYCLE_SCRIPTS = [
  "scripts/setup-client.ps1",
  "scripts/uninstall-client.ps1",
  "scripts/start-local-client.ps1",
  "scripts/check-local-host.mjs",
  "scripts/local-startup.ps1",
  "scripts/local-host-launcher.vbs",
];

function fail(message) {
  throw new Error(`[local-client-package] ${message}`);
}

function parseArguments(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const separator = argument.indexOf("=");
    if (separator !== -1) {
      args[argument.slice(2, separator)] = argument.slice(separator + 1);
    } else {
      args[argument.slice(2)] = argv[index + 1]?.startsWith("--") ? true : argv[++index];
    }
  }
  return args;
}

function readPackageVersion(rootDir) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  return String(packageJson.version ?? "0.0.0");
}

function hardenClientPackageScripts(packageDir) {
  const packageJsonPath = path.join(packageDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.scripts = {
    ...packageJson.scripts,
    start: "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local-client.ps1",
  };
  delete packageJson.scripts["start:debug"];
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function readManifestVersion(rootDir) {
  const manifestPath = path.join(rootDir, "manifest", "manifest.xml");
  if (!fs.existsSync(manifestPath)) fail(`Không tìm thấy manifest: ${manifestPath}`);
  const source = fs.readFileSync(manifestPath, "utf8");
  const version = source.match(/<Version>([^<]+)<\/Version>/)?.[1]?.trim();
  if (!version || !/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
    fail("Manifest phải có <Version> theo dạng x.y.z.w.");
  }
  return version;
}

function copyRequiredFile(rootDir, outputDir, relativePath) {
  const source = path.join(rootDir, relativePath);
  if (!fs.existsSync(source)) fail(`Không tìm thấy file cần đóng gói: ${source}`);
  const target = path.join(outputDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyRequiredDirectory(rootDir, outputDir, relativePath) {
  const source = path.join(rootDir, relativePath);
  if (!fs.existsSync(source)) fail(`Không tìm thấy thư mục cần đóng gói: ${source}`);
  fs.cpSync(source, path.join(outputDir, relativePath), { recursive: true, force: true });
}

export function createLocalClientPackage({ rootDir = PROJECT_ROOT, outputDir } = {}) {
  const manifestVersion = readManifestVersion(rootDir);
  const packageVersion = readPackageVersion(rootDir);
  const packageDir = outputDir ?? path.join(rootDir, "release", `tvci-word-tools-local-${manifestVersion}`);
  if (fs.existsSync(packageDir)) {
    fail(`Thư mục đầu ra đã tồn tại: ${packageDir}. Không ghi đè gói cũ; hãy chọn --out-dir khác.`);
  }

  fs.mkdirSync(packageDir, { recursive: true });
  for (const relativePath of REQUIRED_FILES) copyRequiredFile(rootDir, packageDir, relativePath);
  for (const relativePath of REQUIRED_DIRECTORIES) copyRequiredDirectory(rootDir, packageDir, relativePath);
  for (const relativePath of LIFECYCLE_SCRIPTS) copyRequiredFile(rootDir, packageDir, relativePath);
  hardenClientPackageScripts(packageDir);

  fs.writeFileSync(path.join(packageDir, "README.txt"), [
    "TVCI Word Tools - gói client local độc lập",
    "",
    `Phiên bản Office manifest: ${manifestVersion}`,
    `Phiên bản project: ${packageVersion}`,
    "",
    "1. Chép thư mục này tới máy khách có Node.js LTS và Microsoft Word.",
    "2. Bấm đúp setup.cmd để cài dependency, certificate, autostart và đăng ký manifest vào Word.",
    "3. Khi cần gỡ, bấm đúp uninstall.cmd.",
    "4. Host local dùng https://localhost:38473; không cần web server trung tâm.",
    "5. Nếu tài liệu cũ còn báo ADD-IN ERROR, đóng Word, chạy lại setup.cmd rồi mở lại Word.",
    "6. Nếu Word vẫn báo ADD-IN ERROR, bấm repair.cmd để khôi phục certificate, autostart và đăng ký manifest mà không chạy npm ci.",
    "7. Trong gói client, npm start cũng dùng host nền an toàn; luồng debug không được phát hành trong package này.",
    "",
    "Gói này cố ý không chứa node_modules, dist, test và source-control metadata.",
    "Host tự khởi động qua launcher watchdog Windows ẩn, không để lại cửa sổ console.",
    "setup.cmd sẽ chạy npm ci theo package-lock.json trên máy khách.",
    "",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(packageDir, "deployment.json"), `${JSON.stringify({
    name: "tvci-word-tools-local",
    mode: "per-machine-local",
    manifestVersion,
    packageVersion,
    hostUrl: "https://localhost:38473",
    requiresNodeLts: true,
    includesNodeModules: false,
  }, null, 2)}\n`, "utf8");

  return { packageDir, manifestVersion, packageVersion };
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const result = createLocalClientPackage({
    outputDir: args["out-dir"] ? path.resolve(String(args["out-dir"])) : undefined,
  });
  console.log(`[local-client-package] Đã tạo gói: ${result.packageDir}`);
  console.log(`[local-client-package] Bấm setup.cmd trên máy khách để cài đặt.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
