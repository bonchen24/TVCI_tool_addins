$script:AppId = '8d912cc6-37a5-4b7a-8c41-6f661a999b36'
$script:InstallDir = Split-Path -Parent $PSScriptRoot
$script:CertDir = Join-Path $InstallDir 'certs'
$script:RunKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$script:WefKey = 'HKCU:\Software\Microsoft\Office\16.0\WEF\Developer'
$script:HostExe = Join-Path $InstallDir 'runtime\node.exe'
$script:HostScript = Join-Path $InstallDir 'server\server.js'

function Get-OfficeInfo {
    $wordPath = $null
    foreach ($appKey in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE')) {
        $item = Get-Item -LiteralPath $appKey -ErrorAction SilentlyContinue
        if ($item) {
            $candidate = $item.GetValue('')
            if ($candidate -and (Test-Path -LiteralPath $candidate)) { $wordPath = $candidate; break }
        }
    }
    if (-not $wordPath) {
        foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
            if ($base) {
                $candidate = Join-Path $base 'Microsoft Office\root\Office16\WINWORD.EXE'
                if (Test-Path -LiteralPath $candidate) { $wordPath = $candidate; break }
            }
        }
    }
    foreach ($view in @([Microsoft.Win32.RegistryView]::Registry64, [Microsoft.Win32.RegistryView]::Registry32)) {
        $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, $view)
        try {
            $entry = $base.OpenSubKey('SOFTWARE\Microsoft\Office\ClickToRun\Configuration')
            if ($entry) {
                try {
                    $platform = $entry.GetValue('Platform')
                    $version = $entry.GetValue('VersionToReport')
                    if ($platform -match '^(x86|x64)$' -and $version) {
                        return [pscustomobject]@{ OfficeArch = $platform; Version = $version; Product = $entry.GetValue('ProductReleaseIds'); WordPath = $wordPath }
                    }
                } finally { $entry.Close() }
            }
        } finally { $base.Close() }
    }
    if ($wordPath -and (Test-Path -LiteralPath $wordPath)) {
        try {
            $fs = [System.IO.File]::OpenRead($wordPath)
            try {
                $br = New-Object System.IO.BinaryReader($fs)
                $fs.Seek(0x3C, [System.IO.SeekOrigin]::Begin) | Out-Null
                $peOffset = $br.ReadInt32()
                $fs.Seek($peOffset + 4, [System.IO.SeekOrigin]::Begin) | Out-Null
                $machine = $br.ReadUInt16()
                $arch = if ($machine -eq 0x8664) { 'x64' } elseif ($machine -eq 0x014c) { 'x86' } else { 'unknown' }
                if ($arch -ne 'unknown') {
                    $versionInfo = (Get-Item -LiteralPath $wordPath).VersionInfo
                    $ver = if ($versionInfo.ProductVersion) { $versionInfo.ProductVersion } else { '16.0' }
                    return [pscustomobject]@{ OfficeArch = $arch; Version = $ver; Product = 'Microsoft Word (Desktop)'; WordPath = $wordPath }
                }
            } finally { $fs.Close() }
        } catch { }
    }
    return [pscustomobject]@{ OfficeArch = 'unknown'; Version = 'unknown'; Product = 'Word/Office not detected'; WordPath = $wordPath }
}

function Test-WebView2 {
    $id = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    foreach ($key in @("HKCU:\Software\Microsoft\EdgeUpdate\Clients\$id", "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$id", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$id")) {
        $version = (Get-ItemProperty -LiteralPath $key -Name pv -ErrorAction SilentlyContinue).pv
        if ($version -and $version -ne '0.0.0.0') { return $version }
    }
    return $null
}

function Get-OwnHost {
    @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
        $_.ExecutablePath -eq $script:HostExe -and $_.CommandLine -like "*$($script:HostScript)*"
    })
}

function Get-PortOwner {
    @(Get-NetTCPConnection -LocalPort 38473 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)[0]
}

function Get-Health {
    try {
        $response = Invoke-RestMethod -Uri 'https://localhost:38473/api/health' -TimeoutSec 4 -ErrorAction Stop
        return ($response.app -eq 'TVCIWordTools' -and $response.status -eq 'ready')
    } catch { return $false }
}
