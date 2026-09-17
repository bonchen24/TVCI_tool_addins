param(
    [string]$ProjectPath = (Get-Location).Path,
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
try {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [Console]::OutputEncoding = $utf8
    $OutputEncoding = $utf8
} catch {
    # Do not block setup if PowerShell cannot change console encoding.
}

$startupFolder = [Environment]::GetFolderPath("Startup")
if ([string]::IsNullOrWhiteSpace($startupFolder)) {
    throw "Khong xac dinh duoc thu muc Startup cua nguoi dung hien tai."
}

$shortcutName = "TVCI Word Tools Local.lnk"
$shortcutPath = Join-Path $startupFolder $shortcutName

if ($Uninstall) {
    if (Test-Path -LiteralPath $shortcutPath) {
        Remove-Item -LiteralPath $shortcutPath -Force
        Write-Output "Da go tu khoi dong TVCI Word Tools: $shortcutPath"
    } else {
        Write-Output "Khong co shortcut tu khoi dong TVCI Word Tools de go."
    }
    exit 0
}

$resolvedProjectPath = (Resolve-Path -LiteralPath $ProjectPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $resolvedProjectPath "package.json"))) {
    throw "Khong tim thay package.json trong thu muc project: $resolvedProjectPath"
}
if (-not (Test-Path -LiteralPath (Join-Path $resolvedProjectPath "node_modules"))) {
    throw "Chua co node_modules. Hay chay npm ci truoc."
}
$launcherPath = Join-Path $resolvedProjectPath "scripts\local-host-launcher.vbs"
if (-not (Test-Path -LiteralPath $launcherPath)) {
    throw "Khong tim thay launcher host an: $launcherPath"
}

$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
$wscriptCommand = (Get-Command wscript.exe -ErrorAction Stop).Source
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $wscriptCommand
$shortcut.Arguments = "//B //Nologo `"$launcherPath`" `"$resolvedProjectPath`" `"$npmCommand`""
$shortcut.WorkingDirectory = $resolvedProjectPath
$shortcut.Description = "TVCI Word Tools - HTTPS local task pane (hidden)"
$shortcut.Save()

Write-Output "Da bat tu khoi dong server local TVCI Word Tools: $shortcutPath"
Write-Output "Server se chay tai https://localhost:38473 sau moi lan dang nhap."
