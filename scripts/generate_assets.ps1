Add-Type -AssemblyName System.Drawing

$srcLogoPath = Join-Path $PWD "public\carepoint-logo-transparent.png"
if (-not (Test-Path $srcLogoPath)) {
    Write-Error "Logo not found at $srcLogoPath"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcLogoPath)

# 1. Launcher icon sizes:
# mdpi: 48x48 (fg: 108x108)
# hdpi: 72x72 (fg: 162x162)
# xhdpi: 96x96 (fg: 216x216)
# xxhdpi: 144x144 (fg: 324x324)
# xxxhdpi: 192x192 (fg: 432x432)

$iconDensities = @(
    @{ Folder = "mipmap-mdpi"; Size = 48; FgSize = 108 },
    @{ Folder = "mipmap-hdpi"; Size = 72; FgSize = 162 },
    @{ Folder = "mipmap-xhdpi"; Size = 96; FgSize = 216 },
    @{ Folder = "mipmap-xxhdpi"; Size = 144; FgSize = 324 },
    @{ Folder = "mipmap-xxxhdpi"; Size = 192; FgSize = 432 }
)

function Draw-HighQualityImage($graphics) {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
}

foreach ($d in $iconDensities) {
    $dir = Join-Path $PWD "android\app\src\main\res\$($d.Folder)"
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }

    # A) ic_launcher.png (square with rounded soft border or white fill)
    $s = $d.Size
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    Draw-HighQualityImage $g
    $g.Clear([System.Drawing.Color]::White)
    
    # Draw logo scaled to 80% of icon
    $padding = [int]($s * 0.1)
    $targetW = $s - ($padding * 2)
    $targetH = $targetW
    $g.DrawImage($srcImg, $padding, $padding, $targetW, $targetH)
    $g.Dispose()
    $bmp.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    # B) ic_launcher_round.png (round circular icon with white fill)
    $bmpRound = New-Object System.Drawing.Bitmap $s, $s
    $gRound = [System.Drawing.Graphics]::FromImage($bmpRound)
    Draw-HighQualityImage $gRound
    $gRound.Clear([System.Drawing.Color]::Transparent)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $s, $s)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $gRound.FillPath($brush, $path)
    $gRound.SetClip($path)
    $gRound.DrawImage($srcImg, $padding, $padding, $targetW, $targetH)
    $brush.Dispose()
    $path.Dispose()
    $gRound.Dispose()
    $bmpRound.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpRound.Dispose()

    # C) ic_launcher_foreground.png (adaptive foreground, logo in center 66% safe zone, transparent background)
    $fg = $d.FgSize
    $bmpFg = New-Object System.Drawing.Bitmap $fg, $fg
    $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
    Draw-HighQualityImage $gFg
    $gFg.Clear([System.Drawing.Color]::Transparent)
    
    # 66% of canvas is safe zone
    $logoSize = [int]($fg * 0.65)
    $offset = [int](($fg - $logoSize) / 2)
    $gFg.DrawImage($srcImg, $offset, $offset, $logoSize, $logoSize)
    $gFg.Dispose()
    $bmpFg.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Dispose()

    Write-Host "Generated launcher icons for $($d.Folder)"
}

# 2. Splash screens
$splashConfigs = @(
    @{ Folder = "drawable"; W = 480; H = 320 },
    @{ Folder = "drawable-port-mdpi"; W = 320; H = 480 },
    @{ Folder = "drawable-port-hdpi"; W = 480; H = 800 },
    @{ Folder = "drawable-port-xhdpi"; W = 720; H = 1280 },
    @{ Folder = "drawable-port-xxhdpi"; W = 960; H = 1600 },
    @{ Folder = "drawable-port-xxxhdpi"; W = 1280; H = 1920 },
    @{ Folder = "drawable-land-mdpi"; W = 480; H = 320 },
    @{ Folder = "drawable-land-hdpi"; W = 800; H = 480 },
    @{ Folder = "drawable-land-xhdpi"; W = 1280; H = 720 },
    @{ Folder = "drawable-land-xxhdpi"; W = 1600; H = 960 },
    @{ Folder = "drawable-land-xxxhdpi"; W = 1920; H = 1280 }
)

foreach ($sc in $splashConfigs) {
    $dir = Join-Path $PWD "android\app\src\main\res\$($sc.Folder)"
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }

    $w = $sc.W
    $h = $sc.H
    $bmpSplash = New-Object System.Drawing.Bitmap $w, $h
    $gSplash = [System.Drawing.Graphics]::FromImage($bmpSplash)
    Draw-HighQualityImage $gSplash
    # Clean white background
    $gSplash.Clear([System.Drawing.Color]::White)

    # Determine logo scale: max 45% of shorter dimension or 300px
    $minDim = [Math]::Min($w, $h)
    $maxLogoDim = [int]($minDim * 0.45)
    if ($maxLogoDim -lt 80) { $maxLogoDim = 80 }
    
    $targetW = $maxLogoDim
    $targetH = $maxLogoDim
    $posX = [int](($w - $targetW) / 2)
    # Position slightly above vertical center (45% from top) for balanced aesthetics
    $posY = [int](($h - $targetH) * 0.45)

    $gSplash.DrawImage($srcImg, $posX, $posY, $targetW, $targetH)
    $gSplash.Dispose()

    $destPath = Join-Path $dir "splash.png"
    $bmpSplash.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpSplash.Dispose()

    Write-Host "Generated splash for $($sc.Folder) ($w x $h)"
}

$srcImg.Dispose()
Write-Host "All assets generated successfully!"
