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
        $border = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(13, 79, 139), [Math]::Max(1, [Math]::Round($Size / 24)))
        $graphics.DrawRectangle($border, 1, 1, $Size - 3, $Size - 3)
        $border.Dispose()

        if ($Size -ge 80) {
            Draw-ImageContain $graphics $iemm ([System.Drawing.RectangleF]::new(4, 4, 20, 20))
            Draw-ImageContain $graphics $tvci ([System.Drawing.RectangleF]::new($Size - 24, 4, 20, 20))
            $font = [System.Drawing.Font]::new("Segoe UI", 3.6, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
            $smallFont = [System.Drawing.Font]::new("Segoe UI", 3.4, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
            $creditFont = [System.Drawing.Font]::new("Segoe UI", 2.35, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
            $center = [System.Drawing.StringFormat]::new()
            $center.Alignment = [System.Drawing.StringAlignment]::Center
            $center.LineAlignment = [System.Drawing.StringAlignment]::Center
            $center.FormatFlags = [System.Drawing.StringFormatFlags]::LineLimit
            $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(15, 63, 103))
            $graphics.DrawString($instituteName, $font, $brush, [System.Drawing.RectangleF]::new(2, 27, 76, 17), $center)
            $graphics.DrawString($centerName, $smallFont, $brush, [System.Drawing.RectangleF]::new(2, 44, 76, 17), $center)
            $graphics.DrawString($developerCredit, $creditFont, $brush, [System.Drawing.RectangleF]::new(3, 62, 74, 16), $center)
            $brush.Dispose()
            $center.Dispose()
            $font.Dispose()
            $smallFont.Dispose()
            $creditFont.Dispose()
        } else {
            $gap = [Math]::Max(1, [Math]::Round($Size / 16))
            $logoWidth = ($Size - ($gap * 3)) / 2
            Draw-ImageContain $graphics $iemm ([System.Drawing.RectangleF]::new($gap, $gap, $logoWidth, $Size - ($gap * 2)))
            Draw-ImageContain $graphics $tvci ([System.Drawing.RectangleF]::new($gap * 2 + $logoWidth, $gap, $logoWidth, $Size - ($gap * 2)))
        }

        $outputPath = Join-Path $ribbonRoot ("icon-brand-badge-{0}.png" -f $Size)
        $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
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
