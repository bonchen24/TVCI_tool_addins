import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const RELEASE_DIR = path.join(PROJECT_ROOT, "release");
const STAGING_DIR = path.join(RELEASE_DIR, "staging");

function fail(message) {
    console.error(`[FATAL] ${message}`);
    process.exit(1);
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) fail(`Missing directory: ${src}`);
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function findIscc() {
    const paths = [
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Inno Setup 6", "ISCC.exe"),
        path.join(process.env["ProgramFiles(x86)"] || "", "Inno Setup 6", "ISCC.exe"),
        path.join(process.env.ProgramFiles || "", "Inno Setup 6", "ISCC.exe"),
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function getSha256(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

function main() {
    console.log("1. Cleaning release staging...");
    if (fs.existsSync(STAGING_DIR)) fs.rmSync(STAGING_DIR, { recursive: true, force: true });
    fs.mkdirSync(STAGING_DIR, { recursive: true });

    console.log("2. Running npm run build...");
    try {
        execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "inherit" });
    } catch (e) {
        fail("Build failed.");
    }

    console.log("3. Preparing installer staging...");
    copyDir(path.join(PROJECT_ROOT, "dist"), path.join(STAGING_DIR, "app"));
    copyDir(path.join(PROJECT_ROOT, "manifest"), path.join(STAGING_DIR, "manifest"));
    
    fs.mkdirSync(path.join(STAGING_DIR, "server"), { recursive: true });
    fs.copyFileSync(path.join(PROJECT_ROOT, "installer", "server.js"), path.join(STAGING_DIR, "server", "server.js"));
    
    fs.mkdirSync(path.join(STAGING_DIR, "scripts"), { recursive: true });
    fs.copyFileSync(path.join(PROJECT_ROOT, "installer", "launcher.vbs"), path.join(STAGING_DIR, "scripts", "launcher.vbs"));
    fs.copyFileSync(path.join(PROJECT_ROOT, "installer", "setup.ps1"), path.join(STAGING_DIR, "scripts", "setup.ps1"));
    fs.copyFileSync(path.join(PROJECT_ROOT, "installer", "uninstall.ps1"), path.join(STAGING_DIR, "scripts", "uninstall.ps1"));
    fs.copyFileSync(path.join(PROJECT_ROOT, "installer", "repair.cmd"), path.join(STAGING_DIR, "scripts", "repair.cmd"));
    fs.copyFileSync(path.join(PROJECT_ROOT, "installer", "repair.cmd"), path.join(STAGING_DIR, "repair.cmd"));
    fs.copyFileSync(path.join(PROJECT_ROOT, "scripts", "verify-installation.ps1"), path.join(STAGING_DIR, "scripts", "verify-installation.ps1"));
    
    fs.mkdirSync(path.join(STAGING_DIR, "runtime"), { recursive: true });
    console.log(`Copying node executable from ${process.execPath}...`);
    fs.copyFileSync(process.execPath, path.join(STAGING_DIR, "runtime", "node.exe"));
    const webviewInstaller = path.join(PROJECT_ROOT, "installer", "MicrosoftEdgeWebview2Setup.exe");
    if (fs.existsSync(webviewInstaller)) {
        fs.copyFileSync(webviewInstaller, path.join(STAGING_DIR, "runtime", "MicrosoftEdgeWebview2Setup.exe"));
    }

    console.log("4. Checking Inno Setup...");
    const iscc = findIscc();
    if (!iscc) {
        fail("Inno Setup 6 chưa được cài trên máy build.");
    }

    console.log(`Found ISCC at ${iscc}`);
    console.log("5. Compiling EXE...");
    try {
        const issPath = path.join(PROJECT_ROOT, "installer", "TVCIWordTools.iss");
        execSync(`"${iscc}" "${issPath}"`, { cwd: PROJECT_ROOT, stdio: "inherit" });
    } catch (e) {
        fail("Inno Setup compilation failed.");
    }

    console.log("6. Verifying output...");
    const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
    const version = packageJson.version;
    const exeName = `TVCI-Word-Tools-Setup-${version}-x64.exe`;
    const exePath = path.join(RELEASE_DIR, exeName);
    
    if (!fs.existsSync(exePath)) {
        fail(`Expected output ${exeName} not found.`);
    }

    const sha256 = getSha256(exePath);
    fs.writeFileSync(`${exePath}.sha256`, sha256);
    
    const stats = fs.statSync(exePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    console.log("=========================================");
    console.log(`EXE: ${exePath}`);
    console.log(`Size: ${sizeMb} MB`);
    console.log(`SHA-256: ${sha256}`);
    console.log("=========================================");
}

main();
