param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$FlutterArgs
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$flutterBat = Join-Path $repoRoot 'flutter_sdk\flutter\bin\flutter.bat'
$mingitCmd = Join-Path $repoRoot 'tools\mingit\cmd'

if (!(Test-Path $flutterBat)) {
  throw "Flutter bulunamadi: $flutterBat"
}

if (Test-Path $mingitCmd) {
  $env:Path = "$mingitCmd;$env:Path"
}

& $flutterBat @FlutterArgs
exit $LASTEXITCODE
