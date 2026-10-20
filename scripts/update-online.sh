#!/usr/bin/env bash
set -Eeuo pipefail

update_phase='pemeriksaan awal'
maintenance_started=false

report_update_result() {
    local result=$?
    if (( result != 0 )); then
        printf '\nUpdate gagal pada tahap: %s.\n' "$update_phase" >&2
        if [[ "$maintenance_started" == true ]]; then
            echo 'Web tetap dalam mode maintenance agar update yang belum selesai tidak digunakan.' >&2
            echo 'Perbaiki error di atas, lalu jalankan kembali: bash scripts/update-online.sh' >&2
        fi
        echo 'Cadangan Git stash tidak diterapkan atau dihapus otomatis.' >&2
    fi
}

main() {
    local project_root runtime remote upstream target backup_revision
    project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
    cd "$project_root"
    umask 077

    for dependency in git php composer npm flock curl; do
        command -v "$dependency" >/dev/null || { echo "Perintah $dependency belum tersedia." >&2; exit 1; }
    done
    [[ -f .env && -f vendor/autoload.php ]] || { echo 'Skrip ini untuk memperbarui aplikasi yang sudah terpasang.' >&2; exit 1; }
    git check-ignore -q .env || { echo '.env harus diabaikan Git sebelum menjalankan update.' >&2; exit 1; }
    [[ "$(git branch --show-current)" == main ]] || { echo 'Update harus dijalankan dari branch main.' >&2; exit 1; }
    [[ ! -f public/hot ]] || { echo 'Hentikan Vite dev dan hapus public/hot sebelum update online.' >&2; exit 1; }

    runtime="$project_root/.runtime"
    mkdir -p "$runtime/run" "$runtime/tmp"
    exec 8>"$runtime/run/update-online.lock"
    flock -n 8 || { echo 'Update lain sedang berjalan.' >&2; exit 1; }
    export TMPDIR="$runtime/tmp"
    export LD_LIBRARY_PATH="$runtime/mariadb/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
    php -r 'exit(PHP_VERSION_ID >= 80400 ? 0 : 1);' || { echo 'Update memerlukan PHP 8.4 atau lebih baru.' >&2; exit 1; }

    update_phase='mengambil pembaruan GitHub'
    remote="$(git config --get branch.main.remote)"
    upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}')"
    [[ "$remote" != . ]] || { echo 'Branch main harus mengikuti remote GitHub.' >&2; exit 1; }
    git fetch --prune "$remote"
    target="$(git rev-parse "$upstream")"
    git merge-base --is-ancestor HEAD "$target" || {
        echo 'Commit lokal berbeda dari GitHub. Update dihentikan tanpa menimpa commit lokal.' >&2
        exit 1
    }

    if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
        update_phase='mencadangkan perubahan lokal'
        git stash push --include-untracked -m "Backup server sebelum update $(date -u +%Y%m%dT%H%M%SZ)"
        backup_revision="$(git rev-parse refs/stash)"
        printf 'Perubahan lokal dicadangkan ke Git stash: %s\n' "$backup_revision"
    fi

    update_phase='mengaktifkan maintenance'
    if [[ ! -f storage/framework/down ]]; then
        php artisan down --retry=60 --no-interaction
    fi
    maintenance_started=true

    update_phase='memperbarui source'
    git merge --ff-only "$target"

    update_phase='memasang dependensi PHP'
    composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction

    update_phase='memasang dependensi frontend'
    npm ci --include=dev

    update_phase='membangun frontend'
    npm run build
    [[ -s public/build/manifest.json ]] || { echo 'Manifest hasil build tidak ditemukan.' >&2; exit 1; }

    update_phase='memperbarui database dan cache'
    php artisan optimize:clear --no-interaction
    php artisan migrate --force --no-interaction
    php artisan optimize --no-interaction

    update_phase='mengaktifkan web'
    php artisan up --no-interaction
    maintenance_started=false

    update_phase='memeriksa layanan online'
    # Startup already checks the web, scheduler, database, and existing tunnel.
    bash scripts/start-online.sh 8>&-

    printf '\nUpdate selesai. Versi aktif: %s\n' "$(git rev-parse --short HEAD)"
    echo 'Silakan muat ulang halaman browser. Cadangan Git stash tetap tersimpan.'
}

trap report_update_result EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
main "$@"
