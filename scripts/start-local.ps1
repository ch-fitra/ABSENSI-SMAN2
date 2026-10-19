param([ValidateSet('serve','schedule')][string]$Mode = 'serve')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$phpPath = Join-Path $PWD '.runtime\php\php.exe'
if (-not (Test-Path -LiteralPath $phpPath)) { throw 'Jalankan scripts/setup-windows.ps1 terlebih dahulu, atau gunakan PHP 8.4 pada PATH.' }
$env:PATH = (Split-Path $phpPath -Parent) + ';' + $env:PATH
if ($Mode -eq 'schedule') { & $phpPath artisan schedule:work } else { & $phpPath artisan serve --host=127.0.0.1 --port=8000 }
exit $LASTEXITCODE
