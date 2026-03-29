param(
    [switch]$SkipAnalyze,
    [switch]$SkipTest
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileRoot = Resolve-Path (Join-Path $scriptRoot "..")
Set-Location $mobileRoot

$keyPropertiesPath = Join-Path $mobileRoot "android\key.properties"
if (!(Test-Path $keyPropertiesPath)) {
    throw "Eksik dosya: android/key.properties. setup_android_signing.ps1 ile olusturun."
}

$requiredKeys = @("storeFile", "storePassword", "keyAlias", "keyPassword")
$kv = @{}

Get-Content $keyPropertiesPath | ForEach-Object {
    if ($_ -match "^\s*#") { return }
    if ($_ -match "^\s*$") { return }
    $parts = $_.Split("=", 2)
    if ($parts.Count -eq 2) {
        $kv[$parts[0].Trim()] = $parts[1].Trim()
    }
}

foreach ($key in $requiredKeys) {
    if (-not $kv.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($kv[$key])) {
        throw "android/key.properties icinde eksik alan: $key"
    }
}

# Keep path resolution consistent with Gradle's `file(...)` in app/build.gradle.kts,
# which resolves relative paths from `mobile_flutter/android/app`.
$keystoreCandidate = Join-Path (Join-Path $mobileRoot "android\\app") $kv["storeFile"]
$keystorePath = [System.IO.Path]::GetFullPath($keystoreCandidate)
if (!(Test-Path $keystorePath)) {
    throw "Keystore bulunamadi: $keystorePath"
}

if (-not $SkipAnalyze) {
    & ..\flutterw.cmd analyze
    if ($LASTEXITCODE -ne 0) {
        throw "flutter analyze basarisiz oldu (exit code: $LASTEXITCODE)."
    }
}

if (-not $SkipTest) {
    & ..\flutterw.cmd test
    if ($LASTEXITCODE -ne 0) {
        throw "flutter test basarisiz oldu (exit code: $LASTEXITCODE)."
    }
}

$aabPath = Join-Path $mobileRoot "build\app\outputs\bundle\release\app-release.aab"
if (Test-Path $aabPath) {
    Remove-Item -Path $aabPath -Force
}

& ..\flutterw.cmd build appbundle --release
if ($LASTEXITCODE -ne 0) {
    throw "Release build basarisiz oldu (exit code: $LASTEXITCODE)."
}

if (Test-Path $aabPath) {
    Write-Host "Release AAB hazir: $aabPath"
} else {
    throw "AAB olusmadi. Build logunu kontrol edin."
}
