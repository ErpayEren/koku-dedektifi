param(
  [string]$Org = "com.kokudedektifi",
  [string]$ProjectName = "koku_dedektifi_mobile"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "Checking Flutter installation..."
flutter --version

if (!(Test-Path ".\android") -or !(Test-Path ".\ios")) {
  Write-Host "Generating platform folders with flutter create..."
  flutter create . --platforms=android,ios --org $Org --project-name $ProjectName
}

Write-Host "Installing dependencies..."
flutter pub get

Write-Host ""
Write-Host "Bootstrap complete."
Write-Host "Run on Android:"
Write-Host "  flutter run -d android"
Write-Host "Run on iOS:"
Write-Host "  flutter run -d ios"
