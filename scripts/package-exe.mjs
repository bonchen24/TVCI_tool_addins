import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const RELEASE_DIR = path.join(ROOT_DIR, "release");
const CSC_PATH = "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe";

// Find iscc.exe in common locations
function findIscc() {
  const possiblePaths = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Inno Setup 6", "iscc.exe"),
    "C:\\Program Files (x86)\\Inno Setup 6\\iscc.exe",
    "C:\\Program Files\\Inno Setup 6\\iscc.exe",
    "C:\\Program Files (x86)\\Inno Setup 5\\iscc.exe",
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

console.log("=== TVCI WORD TOOLS - QUY TRÌNH ĐÓNG GÓI BỘ CÀI ĐẶT .EXE ===");

if (!fs.existsSync(RELEASE_DIR)) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

// 1. Build dist
console.log("\n[1/5] Đang build Webpack production...");
execSync("npm run build", { cwd: ROOT_DIR, stdio: "inherit" });

// 2. Compile tvci-host.exe
console.log("\n[2/5] Đang biên dịch máy chủ ngầm tvci-host.exe...");
if (!fs.existsSync(CSC_PATH)) {
  throw new Error(`Không tìm thấy csc.exe tại ${CSC_PATH}`);
}
const hostCsPath = path.join(ROOT_DIR, "src-host", "tvci-host.cs");
const hostExePath = path.join(RELEASE_DIR, "tvci-host.exe");
execSync(`"${CSC_PATH}" /target:winexe /optimize+ /out:"${hostExePath}" "${hostCsPath}"`, {
  cwd: ROOT_DIR,
  stdio: "inherit",
});
console.log(`-> tvci-host.exe đã tạo thành công (${fs.statSync(hostExePath).size} bytes).`);

// 3. Generate Certs (Root CA & Server cert valid 2020-2050)
console.log("\n[3/5] Đóng gói chứng chỉ SSL Localhost (CA & Server cert 2020 - 2050)...");
execSync("python scripts/generate-certificates.py", {
  cwd: ROOT_DIR,
  stdio: "inherit",
});


// 4. Generate Guide Docx
console.log("\n[4/5] Cập nhật tài liệu hướng dẫn Word (.docx)...");
execSync("python scripts/generate-guide-docx.py", { cwd: ROOT_DIR, stdio: "inherit" });

// 5. Run Inno Setup Compiler
console.log("\n[5/5] Đang đóng gói file cài đặt .exe qua Inno Setup...");
const isccPath = findIscc();
if (!isccPath) {
  throw new Error("Không tìm thấy trình biên dịch iscc.exe của Inno Setup trên máy.");
}
const issPath = path.join(ROOT_DIR, "installer", "tvci_setup.iss");
execSync(`"${isccPath}" "${issPath}"`, { cwd: ROOT_DIR, stdio: "inherit" });

const finalExePath = path.join(RELEASE_DIR, "TVCI_Word_Addin_Setup_v1.0.0.exe");
if (fs.existsSync(finalExePath)) {
  const stats = fs.statSync(finalExePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log("\n========================================================");
  console.log("🎉 ĐÓNG GÓI THÀNH CÔNG BỘ CÀI ĐẶT .EXE!");
  console.log(`Đường dẫn: ${finalExePath}`);
  console.log(`Kích thước: ${sizeMB} MB (${stats.size} bytes)`);
  console.log("========================================================\n");
} else {
  console.warn("Không tìm thấy file đầu ra mong đợi tại " + finalExePath);
}
