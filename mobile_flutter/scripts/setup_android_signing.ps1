param(
    [Parameter(Mandatory = $true)]
    [string]$StorePassword,
    [string]$KeyPassword = "",
    [string]$KeyAlias = "upload",
    [string]$StoreFileName = "upload-keystore.jks",
    [string]$DistinguishedName = "CN=Koku Dedektifi, OU=Mobile, O=Koku Dedektifi, L=Istanbul, S=Istanbul, C=TR",
    [int]$ValidityDays = 10000,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($KeyPassword)) {
    $KeyPassword = $StorePassword
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileRoot = Resolve-Path (Join-Path $scriptRoot "..")
$projectRoot = Resolve-Path (Join-Path $mobileRoot "..")
$keystoreDir = Join-Path $mobileRoot "keystore"
$keystorePath = Join-Path $keystoreDir $StoreFileName
$androidDir = Join-Path $mobileRoot "android"
$keyPropertiesPath = Join-Path $androidDir "key.properties"
# Gradle resolves this from mobile_flutter/android/app
$storeFileRelative = "../../keystore/$StoreFileName"

function Resolve-KeytoolPath {
    $cmd = Get-Command keytool -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    if ($env:JAVA_HOME) {
        $fromJavaHome = Join-Path $env:JAVA_HOME "bin\\keytool.exe"
        if (Test-Path $fromJavaHome) {
            return $fromJavaHome
        }
    }

    $localJdkRoot = Join-Path $projectRoot "android_env\\jdk"
    if (Test-Path $localJdkRoot) {
        $found = Get-ChildItem -Path $localJdkRoot -Directory |
            Sort-Object Name -Descending |
            ForEach-Object {
                $candidate = Join-Path $_.FullName "bin\\keytool.exe"
                if (Test-Path $candidate) { return $candidate }
            } |
            Select-Object -First 1

        if ($found) {
            return $found
        }
    }

    return $null
}

$keytoolPath = Resolve-KeytoolPath
if ([string]::IsNullOrWhiteSpace($keytoolPath)) {
    throw "keytool bulunamadi. JDK'yi PATH'e ekleyin veya android_env\\jdk altinda JDK bulundurun."
}

if ((Test-Path $keystorePath) -and -not $Force) {
    throw "Keystore zaten var: $keystorePath. Uzerine yazmak icin -Force kullan."
}

if (!(Test-Path $keystoreDir)) {
    New-Item -Path $keystoreDir -ItemType Directory | Out-Null
}

if ((Test-Path $keystorePath) -and $Force) {
    Remove-Item -Path $keystorePath -Force
}

$keytoolArgs = @(
    "-genkeypair",
    "-v",
    "-keystore", $keystorePath,
    "-alias", $KeyAlias,
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", $ValidityDays,
    "-storepass", $StorePassword,
    "-keypass", $KeyPassword,
    "-dname", $DistinguishedName
)

& $keytoolPath @keytoolArgs
if ($LASTEXITCODE -ne 0) {
    throw "keytool islemi basarisiz oldu (exit code: $LASTEXITCODE)."
}

$keyPropertiesContent = @(
    "storePassword=$StorePassword",
    "keyPassword=$KeyPassword",
    "keyAlias=$KeyAlias",
    "storeFile=$storeFileRelative"
) -join "`n"

Set-Content -Path $keyPropertiesPath -Value $keyPropertiesContent -Encoding ASCII

Write-Host "Android signing hazirlandi:"
Write-Host " - keytool: $keytoolPath"
Write-Host " - Keystore: $keystorePath"
Write-Host " - Key properties: $keyPropertiesPath"
