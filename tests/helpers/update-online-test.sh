#!/usr/bin/env bash
set -euo pipefail

source_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
sandbox="$(mktemp -d /tmp/absensi-update-tests.XXXXXXXX)"
[[ "$sandbox" == /tmp/absensi-update-tests.* ]] || exit 1
trap 'rm -rf -- "$sandbox"' EXIT
export GIT_CONFIG_NOSYSTEM=1
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_NAME='Update Test'
export GIT_AUTHOR_EMAIL='update@example.test'
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

mkdir -p "$sandbox/tools" "$sandbox/source/scripts"
cp "$source_root/scripts/update-online.sh" "$sandbox/source/scripts/update-online.sh"
cat > "$sandbox/source/scripts/start-online.sh" <<'SCRIPT'
#!/usr/bin/env bash
echo online >> "$UPDATE_TEST_LOG"
SCRIPT
printf '.env\n.runtime/\nvendor/\nstorage/\npublic/build/\n' > "$sandbox/source/.gitignore"
echo old > "$sandbox/source/version.txt"
git init -q -b main "$sandbox/source"
git -C "$sandbox/source" add .
git -C "$sandbox/source" commit -qm initial
git init -q --bare "$sandbox/remote.git"
git -C "$sandbox/source" remote add origin "$sandbox/remote.git"
git -C "$sandbox/source" push -q -u origin main

cat > "$sandbox/tools/fake-tool" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
tool="$(basename "$0")"
printf '%s %s\n' "$tool" "$*" >> "$UPDATE_TEST_LOG"
if [[ "$tool" == php && "${1:-}" == -r ]]; then exit 0; fi
if [[ "$tool" == php && "${2:-}" == down ]]; then mkdir -p storage/framework; touch storage/framework/down; fi
if [[ "$tool" == php && "${2:-}" == migrate && "${FAIL_STEP:-}" == migrate ]]; then exit 43; fi
if [[ "$tool" == php && "${2:-}" == up ]]; then rm -f storage/framework/down; fi
if [[ "$tool" == npm && "${1:-}" == run ]]; then
    [[ "${FAIL_STEP:-}" != build ]] || exit 42
    mkdir -p public/build
    echo '{}' > public/build/manifest.json
fi
SCRIPT
chmod +x "$sandbox/tools/fake-tool"
for tool in php composer npm curl; do ln -s fake-tool "$sandbox/tools/$tool"; done
export PATH="$sandbox/tools:$PATH"

new_checkout() {
    checkout="$sandbox/$1"
    git clone -q -b main "$sandbox/remote.git" "$checkout"
    mkdir -p "$checkout/vendor" "$checkout/storage/framework"
    touch "$checkout/vendor/autoload.php"
    echo 'APP_KEY=server-secret-preserved' > "$checkout/.env"
    export UPDATE_TEST_LOG="$sandbox/$1.log"
    : > "$UPDATE_TEST_LOG"
}

run_update() {
    (cd "$sandbox" && bash "$checkout/scripts/update-online.sh") > "$sandbox/output.log" 2>&1
}

new_checkout successful
echo custom > "$checkout/version.txt"
echo 'untracked notes' > "$checkout/catatan-lokal.txt"
echo new > "$sandbox/source/version.txt"
echo '# new revision' >> "$sandbox/source/scripts/update-online.sh"
git -C "$sandbox/source" add .
git -C "$sandbox/source" commit -qm update
git -C "$sandbox/source" push -q
run_update
[[ "$(cat "$checkout/version.txt")" == new ]]
[[ "$(git -C "$checkout" show 'stash@{0}:version.txt')" == custom ]]
[[ "$(git -C "$checkout" show 'stash@{0}^3:catatan-lokal.txt')" == 'untracked notes' ]]
[[ "$(cat "$checkout/.env")" == APP_KEY=server-secret-preserved ]]
[[ ! -f "$checkout/storage/framework/down" ]]
[[ "$(tail -n 1 "$UPDATE_TEST_LOG")" == online ]]
echo 'PASS: fast-forward, backup perubahan tracked/untracked, .env, build, migrasi, dan startup.'

new_checkout build-failure
if FAIL_STEP=build run_update; then echo 'Build failure should stop deployment' >&2; exit 1; fi
[[ -f "$checkout/storage/framework/down" ]]
! grep -q 'php artisan migrate\|php artisan up\|^online$' "$UPDATE_TEST_LOG"
grep -q 'membangun frontend' "$sandbox/output.log"
run_update
[[ ! -f "$checkout/storage/framework/down" ]]
[[ "$(tail -n 1 "$UPDATE_TEST_LOG")" == online ]]
echo 'PASS: build gagal mempertahankan maintenance; menjalankan ulang menyelesaikan update.'

new_checkout migration-failure
if FAIL_STEP=migrate run_update; then echo 'Migration failure should stop deployment' >&2; exit 1; fi
[[ -f "$checkout/storage/framework/down" ]]
! grep -q 'php artisan optimize --\|php artisan up\|^online$' "$UPDATE_TEST_LOG"
grep -q 'memperbarui database dan cache' "$sandbox/output.log"
echo 'PASS: migrasi gagal tidak membuka kembali aplikasi atau melanjutkan startup.'

new_checkout divergent
echo local > "$checkout/local-commit.txt"
git -C "$checkout" add local-commit.txt
git -C "$checkout" commit -qm local
echo remote > "$sandbox/source/remote-commit.txt"
git -C "$sandbox/source" add remote-commit.txt
git -C "$sandbox/source" commit -qm remote
git -C "$sandbox/source" push -q
if run_update; then echo 'Divergence should stop deployment' >&2; exit 1; fi
[[ ! -f "$checkout/storage/framework/down" ]]
! grep -q 'php artisan down\|composer install\|^online$' "$UPDATE_TEST_LOG"
[[ -f "$checkout/local-commit.txt" ]]
echo 'PASS: commit berbeda dihentikan sebelum maintenance tanpa menimpa commit lokal.'

new_checkout locked
mkdir -p "$checkout/.runtime/run"
exec 7>"$checkout/.runtime/run/update-online.lock"
flock -n 7
if run_update; then echo 'Concurrent update should stop' >&2; exit 1; fi
! grep -q 'php artisan down\|composer install' "$UPDATE_TEST_LOG"
flock -u 7
exec 7>&-
echo 'PASS: dua update bersamaan dicegah.'
