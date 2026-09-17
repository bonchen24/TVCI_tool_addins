import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

function fail(message) {
  throw new Error(`[client-package] ${message}`);
}

export function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") {
    fail("Thiếu --base-url hoặc biến môi trường TVCI_ADDIN_BASE_URL.");
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`Base URL không hợp lệ: ${value}`);
  }

  if (parsed.protocol !== "https:") {
    fail("Base URL production phải dùng HTTPS để Word có thể tải Office Add-in an toàn.");
  }
  if (parsed.username || parsed.password) {
    fail("Base URL không được chứa thông tin đăng nhập.");
  }
  if (parsed.search || parsed.hash) {
    fail("Base URL không được chứa query string hoặc fragment.");
  }

  return parsed.toString().replace(/\/$/, "");
}

export function renderProductionManifest(source, baseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const origin = new URL(normalizedBaseUrl).origin;
  const rendered = source.replaceAll("https://localhost:38473", normalizedBaseUrl);

  // AppDomain chỉ nhận origin, còn SourceLocation/IconUrl có thể nằm dưới một
  // path triển khai riêng, ví dụ https://intranet/tvci-word-tools.
  return rendered.replace(
    `<AppDomain>${normalizedBaseUrl}</AppDomain>`,
    `<AppDomain>${origin}</AppDomain>`,
  );
}

function parseArguments(argv) {
  const args = {};
  for (const argument of argv) {
    if (!argument.startsWith("--")) continue;
    const separator = argument.indexOf("=");
    if (separator === -1) {
      args[argument.slice(2)] = true;
    } else {
      args[argument.slice(2, separator)] = argument.slice(separator + 1);
    }
  }
  return args;
}

function readPackageVersion(rootDir) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  return String(packageJson.version ?? "0.0.0");
}

function readManifestVersion(source) {
  const match = source.match(/<Version>([^<]+)<\/Version>/);
  const version = match?.[1]?.trim();
  if (!version || !/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
    fail("Manifest phải có <Version> theo dạng x.y.z.w để Word nhận diện bản cập nhật.");
  }
  return version;
}

function copyRequiredDirectory(source, target, label) {
  if (!fs.existsSync(source)) fail(`Không tìm thấy ${label}: ${source}`);
  fs.cpSync(source, target, { recursive: true, force: true });
}

export function createClientPackage({
  rootDir = PROJECT_ROOT,
  baseUrl,
  outputDir,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const packageVersion = readPackageVersion(rootDir);
  const distDir = path.join(rootDir, "dist");
  const sourceManifestPath = path.join(rootDir, "manifest", "manifest.xml");

  if (!fs.existsSync(path.join(distDir, "taskpane.html"))) {
    fail("Chưa có dist/taskpane.html. Hãy chạy npm run build trước khi đóng gói.");
  }
  if (!fs.existsSync(path.join(distDir, "commands.html"))) {
    fail("Chưa có dist/commands.html. Hãy chạy npm run build trước khi đóng gói.");
  }
  if (!fs.existsSync(sourceManifestPath)) {
    fail(`Không tìm thấy manifest phát triển: ${sourceManifestPath}`);
  }

  const sourceManifest = fs.readFileSync(sourceManifestPath, "utf8");
  const manifestVersion = readManifestVersion(sourceManifest);
  const packageDir = outputDir ?? path.join(rootDir, "release", `tvci-word-addin-${manifestVersion}`);
  if (fs.existsSync(packageDir)) {
    fail(`Thư mục đầu ra đã tồn tại: ${packageDir}. Hãy chọn --out-dir khác để tránh ghi đè.`);
  }

  const serverDir = path.join(packageDir, "server");
  const clientDir = path.join(packageDir, "client");
  fs.mkdirSync(serverDir, { recursive: true });
  fs.mkdirSync(clientDir, { recursive: true });
  copyRequiredDirectory(distDir, serverDir, "thư mục build dist");

  const productionManifest = renderProductionManifest(sourceManifest, normalizedBaseUrl);
  fs.writeFileSync(path.join(clientDir, "manifest.xml"), productionManifest, "utf8");

  const packageReadme = [
    "TVCI Word Tools - bộ phân phối production",
    "",
    `Phiên bản Office manifest: ${manifestVersion}`,
    `Phiên bản npm: ${packageVersion}`,
    `Base URL: ${normalizedBaseUrl}`,
    "",
    "1. Đưa toàn bộ nội dung thư mục server lên web server HTTPS tại Base URL.",
    "2. Đảm bảo chứng chỉ TLS được máy khách và Word tin cậy.",
    "3. Phát client/manifest.xml qua Microsoft 365 Admin Center, catalog nội bộ hoặc sideload có kiểm soát.",
    "4. Không đặt API key vào manifest, thư mục server hoặc mã nguồn frontend.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(packageDir, "README.txt"), packageReadme, "utf8");
  fs.writeFileSync(
    path.join(packageDir, "deployment.json"),
    `${JSON.stringify({
      name: "tvci-word-addin",
      manifestVersion,
      packageVersion,
      baseUrl: normalizedBaseUrl,
    }, null, 2)}\n`,
    "utf8",
  );

  return {
    packageDir,
    serverDir,
    clientDir,
    manifestVersion,
    packageVersion,
    baseUrl: normalizedBaseUrl,
  };
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const result = createClientPackage({
    baseUrl: args["base-url"] ?? process.env.TVCI_ADDIN_BASE_URL,
    outputDir: args["out-dir"] ? path.resolve(String(args["out-dir"])) : undefined,
  });

  console.log(`[client-package] Đã tạo bộ phân phối: ${result.packageDir}`);
  console.log(`[client-package] Web root: ${result.serverDir}`);
  console.log(`[client-package] Manifest máy khách: ${path.join(result.clientDir, "manifest.xml")}`);
  console.log(`[client-package] Office manifest version: ${result.manifestVersion}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
