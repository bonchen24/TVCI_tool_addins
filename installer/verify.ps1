[CmdletBinding()]
param([switch]$RibbonOnly)
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'common.ps1')

$logDir = Join-Path $InstallDir 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$verifyLog = Join-Path $logDir 'verify.log'
$failureFile = Join-Path $logDir 'verify-failure.txt'
$failures = New-Object System.Collections.Generic.List[string]

function Check($Name, $Ok, $Detail) {
    $line = if ($Ok) { "PASS $Name $Detail" } else { "FAIL $Name $Detail" }
    Write-Host $line
    Add-Content -LiteralPath $verifyLog -Value ("{0} {1}" -f (Get-Date -Format o), $line)
    if (-not $Ok) { $failures.Add("$Name`: $Detail") }
}

function Test-CanonicalRibbonManifest {
    param([string]$ManifestPath)
    if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
        return [pscustomobject]@{ Ok = $false; Detail = "missing installed manifest: $ManifestPath" }
    }

    $source = Get-Content -LiteralPath $ManifestPath -Raw -ErrorAction SilentlyContinue
    $requiredIds = @(
        'GroupAi', 'GroupDocument', 'GroupQuickInsert', 'GroupLayout',
        'TemplateLibraryButton', 'TemplateWizardButton', 'DocumentToolsMenu',
        'QuickStandardizeButton', 'RollbackButton', 'LearnExperienceButton',
        'KnowledgeButton', 'ItemCheckDocument', 'ItemDocumentSettings'
    )
    $legacyMarkers = @('ShowTaskpane', 'GroupStandardize', 'GroupPageLayout', 'GroupResources')
    $missing = @($requiredIds | Where-Object { $source -notmatch ('id="' + [regex]::Escape($_) + '"') })
    $stale = @($legacyMarkers | Where-Object { $source -match [regex]::Escape($_) })
    $canonicalGroupOrder = $source -match '(?s)<CustomTab\b[^>]*id="TabTVCI".*?<Group id="GroupAi">.*?<Group id="GroupDocument">.*?<Group id="GroupQuickInsert">.*?<Group id="GroupLayout">'
    $details = @()
    if ($missing.Count) { $details += "missing identifiers: $($missing -join ', ')" }
    if ($stale.Count) { $details += "stale legacy markers: $($stale -join ', ')" }
    if (-not $canonicalGroupOrder) { $details += 'canonical Ribbon group order is missing' }
    [pscustomobject]@{
        Ok = ($missing.Count -eq 0 -and $stale.Count -eq 0 -and $canonicalGroupOrder)
        Detail = if ($details.Count) { $details -join '; ' } else { 'canonical Ribbon identifiers and group order present' }
    }
}

$manifestPath = Join-Path $InstallDir 'manifest\manifest.xml'
if ($RibbonOnly) {
    $ribbon = Test-CanonicalRibbonManifest $manifestPath
    Check 'Ribbon manifest' $ribbon.Ok $ribbon.Detail
    if ($failures.Count) {
        $summary = "CHECK FAIL [Verification] $($failures -join '; ')"
        Set-Content -LiteralPath $failureFile -Value $summary -Encoding Ascii
        Write-Host $summary
        exit 1
    }
    Remove-Item -LiteralPath $failureFile -ErrorAction SilentlyContinue
    Write-Host 'READY: canonical Ribbon manifest is installed.'
    exit 0
}

$windowsArch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
$office = Get-OfficeInfo
Write-Host "Windows arch: $windowsArch"
Write-Host "Office version: $($office.Version) [$($office.Product)]"
Write-Host "Office arch: $($office.OfficeArch)"
Check 'Windows architecture' ($windowsArch -eq 'x64') 'x64 host required'
Check 'Office installation' ($office.OfficeArch -in @('x86', 'x64')) 'Office/Word 2024 x86 or x64 detected'
Check 'Word executable' ([bool]$office.WordPath) $office.WordPath

$webview = Test-WebView2
Write-Host "WebView2: $(if ($webview) { $webview } else { 'missing' })"
Check 'WebView2' ([bool]$webview) 'usable runtime registry/file detection'

foreach ($relative in @('runtime\node.exe', 'server\server.js', 'manifest\manifest.xml', 'app\taskpane.html', 'app\templates', 'app\assets')) {
    Check 'Payload' (Test-Path -LiteralPath (Join-Path $InstallDir $relative)) $relative
}

$ribbon = Test-CanonicalRibbonManifest $manifestPath
Check 'Ribbon manifest' $ribbon.Ok $ribbon.Detail
$registered = (Get-ItemProperty -LiteralPath $WefKey -Name $AppId -ErrorAction SilentlyContinue).$AppId
Check 'Manifest registered' ($registered -eq $manifestPath) "expected $manifestPath; actual $registered"

$launcher = Join-Path $InstallDir 'scripts\launcher.vbs'
$run = (Get-ItemProperty -LiteralPath $RunKey -Name 'TVCIWordTools' -ErrorAction SilentlyContinue).TVCIWordTools
Check 'Autostart' ($run -and $run.Contains($HostExe) -and $run.Contains($HostScript) -and $run.Contains($launcher)) 'HKCU Run points to installed production host'

Check 'HTTPS certificate' (Test-TvciCertificate) 'CurrentUser Root and install-local PFX/private key'

$owners = @(Get-PortOwners)
$externalOwners = @(Get-ExternalPortOwners)
$ownerText = if ($owners.Count) { ($owners | ForEach-Object { "PID=$($_.OwningProcess) address=$($_.LocalAddress)" }) -join ', ' } else { 'not listening' }
Write-Host "Port: 38473 $ownerText"
Check 'Port conflict' ($externalOwners.Count -eq 0) 'unrelated processes are never stopped'
$own = @(Get-OwnHost)
Check 'Host running' ($owners.Count -gt 0 -and @($owners | Where-Object { $_.OwningProcess -in @($own | ForEach-Object ProcessId) }).Count -gt 0) 'bundled runtime'
$runtime = Test-TvciCommandRuntime
Check 'Command runtime' $runtime.Ok $runtime.Detail

if ($failures.Count) {
    $summary = "CHECK FAIL [Verification] $($failures -join '; ')"
    Set-Content -LiteralPath $failureFile -Value $summary -Encoding Ascii
    Write-Host $summary
    exit 1
}
Remove-Item -LiteralPath $failureFile -ErrorAction SilentlyContinue
Write-Host 'READY: TVCI Word Tools is installed and healthy.'
exit 0
