[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$InstallDir,
    [Parameter(Mandatory = $true)][string]$OutputFile
)

$ErrorActionPreference = 'SilentlyContinue'
$results = [ordered]@{}

$is64BitWindows = [Environment]::Is64BitOperatingSystem
$results['WindowsX64'] = if ($is64BitWindows) { 'PASS' } else { 'FAIL' }

$wordPath = $null
foreach ($key in @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE',
    'HKCU:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE'
)) {
    $candidate = (Get-Item -LiteralPath $key).GetValue('')
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { $wordPath = $candidate; break }
}
$clickToRunPath = $null
$officeArch = $null
foreach ($key in @(
    'HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Office\ClickToRun\Configuration',
    'HKCU:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration',
    'HKCU:\SOFTWARE\WOW6432Node\Microsoft\Office\ClickToRun\Configuration'
)) {
    $office = Get-ItemProperty -LiteralPath $key -Name Platform, InstallationPath
    $platform = $office.Platform
    if (-not $clickToRunPath -and $office.InstallationPath) { $clickToRunPath = $office.InstallationPath }
    if ($platform -in @('x86', 'x64')) { $officeArch = $platform; break }
}
if (-not $wordPath -and $clickToRunPath) {
    $candidate = Join-Path $clickToRunPath 'root\Office16\WINWORD.EXE'
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { $wordPath = $candidate }
}
if (-not $wordPath) {
    foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
        if (-not $base) { continue }
        foreach ($relative in @('Microsoft Office\root\Office16\WINWORD.EXE', 'Microsoft Office\Office16\WINWORD.EXE')) {
            $candidate = Join-Path $base $relative
            if (Test-Path -LiteralPath $candidate -PathType Leaf) { $wordPath = $candidate; break }
        }
        if ($wordPath) { break }
    }
}
if (-not $officeArch -and $wordPath) {
    try {
        $stream = [System.IO.File]::OpenRead($wordPath)
        try {
            $reader = New-Object System.IO.BinaryReader($stream)
            $stream.Seek(0x3C, [System.IO.SeekOrigin]::Begin) | Out-Null
            $peOffset = $reader.ReadInt32()
            $stream.Seek($peOffset + 4, [System.IO.SeekOrigin]::Begin) | Out-Null
            $machine = $reader.ReadUInt16()
            if ($machine -eq 0x8664) { $officeArch = 'x64' }
            elseif ($machine -eq 0x014c) { $officeArch = 'x86' }
        } finally { $stream.Dispose() }
    } catch { }
}
$results['WordOffice'] = if ($wordPath) { 'PASS' } else { 'FAIL' }
$results['OfficeArch'] = if ($officeArch) { "PASS:$officeArch" } else { 'FAIL:khong-xac-dinh' }

$webViewInstalled = $false
$webViewId = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
foreach ($key in @(
    "HKCU:\Software\Microsoft\EdgeUpdate\Clients\$webViewId",
    "HKCU:\Software\WOW6432Node\Microsoft\EdgeUpdate\Clients\$webViewId",
    "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$webViewId",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$webViewId"
)) {
    $version = (Get-ItemProperty -LiteralPath $key -Name pv).pv
    if ($version -and $version -ne '0.0.0.0') { $webViewInstalled = $true; break }
}
if (-not $webViewInstalled) {
    foreach ($base in @("${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application", "$env:ProgramFiles\Microsoft\EdgeWebView\Application", "$env:LOCALAPPDATA\Microsoft\EdgeWebView\Application")) {
        if ($base -and (Get-ChildItem -LiteralPath $base -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'msedgewebview2.exe') -PathType Leaf } | Select-Object -First 1)) { $webViewInstalled = $true; break }
    }
}
$results['WebView2'] = if ($webViewInstalled) { 'PASS' } else { 'WARN' }

$portAvailable = $true
try {
    $ownServer = Join-Path $InstallDir 'server\server.js'
    $ownPids = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$ownServer*" } | ForEach-Object ProcessId)
    $listeners = @(Get-NetTCPConnection -LocalPort 38473 -State Listen)
    $portAvailable = @($listeners | Where-Object { $_.OwningProcess -notin $ownPids }).Count -eq 0
} catch { $portAvailable = $false }
$results['Port38473'] = if ($portAvailable) { 'PASS' } else { 'FAIL' }

$writeTest = Join-Path $InstallDir ('.tvci-write-test-' + [guid]::NewGuid().ToString('N') + '.tmp')
try {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    [System.IO.File]::WriteAllText($writeTest, 'test')
    $results['InstallFolder'] = 'PASS'
} catch { $results['InstallFolder'] = 'FAIL' }
finally { Remove-Item -LiteralPath $writeTest -Force }

New-Item -ItemType Directory -Path (Split-Path -Parent $OutputFile) -Force | Out-Null
[System.IO.File]::WriteAllLines($OutputFile, @($results.Keys | ForEach-Object { "$_|$($results[$_])" }), [System.Text.Encoding]::ASCII)
if ($results['WindowsX64'] -eq 'FAIL' -or $results['WordOffice'] -eq 'FAIL' -or $results['OfficeArch'] -like 'FAIL*' -or $results['Port38473'] -eq 'FAIL' -or $results['InstallFolder'] -eq 'FAIL') { exit 1 }
exit 0
