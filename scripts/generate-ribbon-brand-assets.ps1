[CmdletBinding()]
param(
    [string]$ProjectPath = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    $ProjectPath = Split-Path -Parent $PSScriptRoot
}

Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $ProjectPath "assets"
$ribbonRoot = Join-Path $assetRoot "ribbon"
$iemmPath = Join-Path $assetRoot "logo-iemm.jpg"
$tvciPath = Join-Path $assetRoot "logo-tvci.png"
$brandingPath = Join-Path $ProjectPath "src\branding.ts"

foreach ($path in @($iemmPath, $tvciPath, $brandingPath)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing branding input: $path"
    }
}

New-Item -ItemType Directory -Path $ribbonRoot -Force | Out-Null
$brandingSource = [System.IO.File]::ReadAllText($brandingPath, [System.Text.Encoding]::UTF8)
$instituteName = [regex]::Match($brandingSource, "titleLines:\s*\[\s*'([^']+)'").Groups[1].Value
$centerName = [regex]::Match($brandingSource, "titleLines:\s*\[\s*'[^']+',\s*'([^']+)'").Groups[1].Value
$developerCredit = [regex]::Match($brandingSource, "developerCredit:\s*'([^']+)'").Groups[1].Value
if ([string]::IsNullOrWhiteSpace($instituteName) -or [string]::IsNullOrWhiteSpace($centerName) -or [string]::IsNullOrWhiteSpace($developerCredit)) {
    throw "Branding title lines are missing from src/branding.ts"
}

function Draw-ImageContain {
    param(
        [System.Drawing.Graphics]$Graphics,
        [System.Drawing.Image]$Image,
        [System.Drawing.RectangleF]$Bounds
    )

    $scale = [Math]::Min($Bounds.Width / $Image.Width, $Bounds.Height / $Image.Height)
    $width = $Image.Width * $scale
    $height = $Image.Height * $scale
    $x = $Bounds.X + (($Bounds.Width - $width) / 2)
    $y = $Bounds.Y + (($Bounds.Height - $height) / 2)
    $Graphics.DrawImage($Image, [System.Drawing.RectangleF]::new($x, $y, $width, $height))
}

function New-BrandBadge {
    param([int]$Size)

    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $iemm = [System.Drawing.Image]::FromFile($iemmPath)
    $tvci = [System.Drawing.Image]::FromFile($tvciPath)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.Clear([System.Drawing.Color]::White)

    try {
        $border = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, 218, 226), 1)
        $graphics.DrawRectangle($border, 0, 0, $Size - 1, $Size - 1)
        $border.Dispose()

        $pad = [Math]::Max(1, [Math]::Round($Size / 16))
        $bounds = [System.Drawing.RectangleF]::new($pad, $pad, $Size - ($pad * 2), $Size - ($pad * 2))
        Draw-ImageContain $graphics $tvci $bounds

        $outputPath = Join-Path $ribbonRoot ("icon-brand-badge-{0}.png" -f $Size)
        $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $rootAppIcon = Join-Path $assetRoot ("icon-{0}.png" -f $Size)
        $bitmap.Save($rootAppIcon, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $iemm.Dispose()
        $tvci.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

foreach ($size in @(16, 32, 80)) {
    New-BrandBadge $size
}

Write-Output "Ribbon brand badges generated at $ribbonRoot"
