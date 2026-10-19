param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$runtimePath = Join-Path $PWD '.runtime'
$phpPath = Join-Path $runtimePath 'php\php.exe'
if (-not (Test-Path -LiteralPath $phpPath)) {
    New-Item -ItemType Directory -Force $runtimePath | Out-Null
    $archivePath = Join-Path $runtimePath 'php.zip'
    $release = (Invoke-RestMethod 'https://windows.php.net/downloads/releases/releases.json').'8.4'.'nts-vs17-x64'.zip
    if (-not $release.path -or -not $release.sha256) { throw 'Metadata unduhan PHP tidak valid.' }
    Invoke-WebRequest ('https://windows.php.net/downloads/releases/' + $release.path) -OutFile $archivePath
    if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLower() -ne $release.sha256) { throw 'Checksum PHP tidak sesuai.' }
    Expand-Archive -LiteralPath $archivePath -DestinationPath (Join-Path $runtimePath 'php')
    $ini = Get-Content -LiteralPath (Join-Path $runtimePath 'php\php.ini-development') -Raw
    $ini = $ini.Replace(';extension_dir = "ext"', 'extension_dir = "ext"')
    foreach ($extension in @('curl','fileinfo','gd','intl','mbstring','mysqli','openssl','pdo_mysql','pdo_sqlite','sqlite3','zip')) {
        $ini = $ini.Replace(';extension=' + $extension, 'extension=' + $extension)
    }
    $ini = $ini.Replace('memory_limit = 128M', 'memory_limit = 512M')
    [IO.File]::WriteAllText((Join-Path $runtimePath 'php\php.ini'), $ini)
}
$env:PATH = (Split-Path $phpPath -Parent) + ';' + $env:PATH
& $phpPath -v
if ($LASTEXITCODE -ne 0) { throw 'PHP gagal dijalankan. Pasang Microsoft Visual C++ Redistributable x64 terbaru.' }
if (-not $SkipInstall) {
    composer install --no-interaction --prefer-dist
    if ($LASTEXITCODE -ne 0) { throw 'Instalasi Composer gagal.' }
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Instalasi npm gagal.' }
    if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
    Write-Host 'Sesuaikan koneksi database di .env, lalu jalankan key:generate, migrate, dan teacher:create sesuai README.'
}
