Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot 'CD NGOC ANH - HOA 7-9-20260913T073136Z-1-001'
$outputRoot = Join-Path $projectRoot 'assets\images'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$photos = @(
    @{ Source = 'BDC_2348.jpg'; Target = 'hero.jpg'; Width = 1200 },
    @{ Source = 'BDC_2404.jpg'; Target = 'together.jpg'; Width = 1400 },
    @{ Source = 'BDC_2394.jpg'; Target = 'album-01.jpg'; Width = 1000 },
    @{ Source = 'BDC_2542.jpg'; Target = 'album-02.jpg'; Width = 1000 },
    @{ Source = 'BDC_2702.jpg'; Target = 'album-03.jpg'; Width = 1000 },
    @{ Source = 'BDC_2445.jpg'; Target = 'album-04.jpg'; Width = 1000 },
    @{ Source = 'BDC_2630.jpg'; Target = 'album-05.jpg'; Width = 1000 },
    @{ Source = 'BDC_2857.jpg'; Target = 'album-06.jpg'; Width = 1400 }
)
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters 1
$encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]86)
foreach ($entry in $photos) {
    $sourceFile = Get-ChildItem -LiteralPath $sourceRoot -Filter $entry.Source -Recurse -File | Select-Object -First 1
    if (-not $sourceFile) { throw "Missing photo: $($entry.Source)" }
    $original = [System.Drawing.Image]::FromFile($sourceFile.FullName)
    $newWidth = [math]::Min($entry.Width, $original.Width)
    $newHeight = [int][math]::Round($original.Height * $newWidth / $original.Width)
    $bitmap = New-Object System.Drawing.Bitmap $newWidth, $newHeight
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($original, 0, 0, $newWidth, $newHeight)
    $bitmap.Save((Join-Path $outputRoot $entry.Target), $jpegCodec, $encoderParameters)
    $graphics.Dispose()
    $bitmap.Dispose()
    $original.Dispose()
    Write-Output "Prepared $($entry.Target) ($newWidth x $newHeight)"
}
$encoderParameters.Dispose()
