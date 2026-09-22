$script:AppId = '8d912cc6-37a5-4b7a-8c41-6f661a999b36'
$script:InstallDir = Split-Path -Parent $PSScriptRoot
$script:CertDir = Join-Path $InstallDir 'certs'
$script:RunKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$script:WefKey = 'HKCU:\Software\Microsoft\Office\16.0\WEF\Developer'
$script:HostExe = Join-Path $InstallDir 'runtime\node.exe'
$script:HostScript = Join-Path $InstallDir 'server\server.js'
$script:HostPort = 38473

function Resolve-ExistingFile {
    param([AllowNull()][string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $candidate = [Environment]::ExpandEnvironmentVariables($Value.Trim().Trim('"'))
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
        return (Get-Item -LiteralPath $candidate).FullName
    }
    return $null
}

function Get-OfficeInfo {
    $wordPath = $null
    $appKeys = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE',
        'HKCU:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE'
    )
    foreach ($appKey in $appKeys) {
        $item = Get-Item -LiteralPath $appKey -ErrorAction SilentlyContinue
        if ($item) {
            $wordPath = Resolve-ExistingFile $item.GetValue('')
            if ($wordPath) { break }
        }
    }

    if (-not $wordPath) {
        foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
            if ($base) {
                foreach ($relative in @(
                    'Microsoft Office\root\Office16\WINWORD.EXE',
                    'Microsoft Office\Office16\WINWORD.EXE'
                )) {
                    $wordPath = Resolve-ExistingFile (Join-Path $base $relative)
                    if ($wordPath) { break }
                }
            }
            if ($wordPath) { break }
        }
    }

    $registryTargets = @(
        @{ Hive = [Microsoft.Win32.RegistryHive]::LocalMachine; View = [Microsoft.Win32.RegistryView]::Registry64 },
        @{ Hive = [Microsoft.Win32.RegistryHive]::LocalMachine; View = [Microsoft.Win32.RegistryView]::Registry32 },
        @{ Hive = [Microsoft.Win32.RegistryHive]::CurrentUser; View = [Microsoft.Win32.RegistryView]::Registry64 },
        @{ Hive = [Microsoft.Win32.RegistryHive]::CurrentUser; View = [Microsoft.Win32.RegistryView]::Registry32 }
    )
    foreach ($target in $registryTargets) {
        $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($target.Hive, $target.View)
        try {
            $entry = $base.OpenSubKey('SOFTWARE\Microsoft\Office\ClickToRun\Configuration')
            if ($entry) {
                try {
                    $platform = [string]$entry.GetValue('Platform')
                    $version = [string]$entry.GetValue('VersionToReport')
                    $installationPath = [string]$entry.GetValue('InstallationPath')
                    if (-not $wordPath -and $installationPath) {
                        $wordPath = Resolve-ExistingFile (Join-Path $installationPath 'root\Office16\WINWORD.EXE')
                    }
                    if ($platform -match '^(x86|x64)$' -and $version) {
                        return [pscustomobject]@{
                            OfficeArch = $platform
                            Version = $version
                            Product = $entry.GetValue('ProductReleaseIds')
                            WordPath = $wordPath
                        }
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
    foreach ($key in @(
        "HKCU:\Software\Microsoft\EdgeUpdate\Clients\$id",
        "HKCU:\Software\WOW6432Node\Microsoft\EdgeUpdate\Clients\$id",
        "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$id",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$id"
    )) {
        $version = (Get-ItemProperty -LiteralPath $key -Name pv -ErrorAction SilentlyContinue).pv
        if ($version -and $version -ne '0.0.0.0') { return $version }
    }
    foreach ($path in @(
        "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
        "$env:ProgramFiles\Microsoft\EdgeWebView\Application",
        "$env:LOCALAPPDATA\Microsoft\EdgeWebView\Application"
    )) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            $dirs = Get-ChildItem -LiteralPath $path -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -match '^\d+\.\d+' } | Sort-Object Name -Descending
            foreach ($dir in $dirs) {
                if (Test-Path -LiteralPath (Join-Path $dir.FullName 'msedgewebview2.exe') -PathType Leaf) {
                    return $dir.Name
                }
            }
        }
    }
    return $null
}

function Get-OwnHost {
    @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
        $_.ExecutablePath -eq $script:HostExe -and $_.CommandLine -like "*$($script:HostScript)*"
    })
}

function Get-PortOwners {
    @(Get-NetTCPConnection -LocalPort $script:HostPort -State Listen -ErrorAction SilentlyContinue)
}

function Get-PortOwner {
    @(Get-PortOwners | Select-Object -First 1)[0]
}

function Get-ExternalPortOwners {
    $ownIds = @(Get-OwnHost | ForEach-Object ProcessId)
    @(Get-PortOwners | Where-Object { $_.OwningProcess -notin $ownIds })
}

function Test-TvciCertificate {
    $stateFile = Join-Path $script:CertDir 'thumbprint.txt'
    $pfxFile = Join-Path $script:CertDir 'localhost.pfx'
    $passwordFile = Join-Path $script:CertDir 'password.txt'
    if (-not ((Test-Path -LiteralPath $stateFile -PathType Leaf) -and
              (Test-Path -LiteralPath $pfxFile -PathType Leaf) -and
              (Test-Path -LiteralPath $passwordFile -PathType Leaf))) { return $false }
    try {
        $thumb = (Get-Content -LiteralPath $stateFile -Raw).Trim().Replace(' ', '')
        if ($thumb -notmatch '^[A-Fa-f0-9]{40}$') { return $false }
        $password = Get-Content -LiteralPath $passwordFile -Raw
        $loaded = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new(
            $pfxFile,
            $password,
            [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet)
        try {
            if ($loaded.Thumbprint -ne $thumb -or -not $loaded.HasPrivateKey -or $loaded.Subject -ne 'CN=TVCI Word Tools localhost') { return $false }
        } finally { $loaded.Dispose() }
        $trusted = Get-ChildItem Cert:\CurrentUser\Root -ErrorAction SilentlyContinue |
            Where-Object { $_.Thumbprint -eq $thumb -and $_.Subject -eq 'CN=TVCI Word Tools localhost' } |
            Select-Object -First 1
        return [bool]$trusted
    } catch { return $false }
}

function Get-Health {
    try {
        $response = Invoke-RestMethod -Uri 'https://localhost:38473/api/health' -TimeoutSec 4 -ErrorAction Stop
        return ($response.app -eq 'TVCIWordTools' -and $response.status -eq 'ready')
    } catch { return $false }
}
