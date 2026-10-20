#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$project_root"
umask 077
runtime="$project_root/.runtime"
mkdir -p "$runtime/tmp" "$runtime/logs" "$runtime/run"
export TMPDIR="$runtime/tmp"
export LD_LIBRARY_PATH="$runtime/mariadb/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

if [[ ! -f .env || ! -f vendor/autoload.php || ! -f public/build/manifest.json || ! -f "$runtime/mysql/my.cnf" ]]; then
    echo 'Konfigurasi atau dependensi belum lengkap.' >&2
    exit 1
fi

exec 9>"$runtime/run/start-online.lock"
flock -n 9 || { echo 'Proses startup lain sedang berjalan.' >&2; exit 1; }

database_client="$runtime/mariadb/usr/bin/mariadb"
database_socket="$runtime/mysql/mysql.sock"
database_admin="$(id -un)"
if ! "$database_client" --no-defaults --socket="$database_socket" --user="$database_admin" --batch --skip-column-names -e 'SELECT 1' >/dev/null 2>&1; then
    if ss -ltnH 'sport = :13306' | grep -q .; then
        echo 'Port database 13306 sedang dipakai; layanan tersebut tidak diubah.' >&2
        exit 1
    fi
    setsid "$runtime/mariadb/usr/sbin/mariadbd" --defaults-file="$runtime/mysql/my.cnf" \
        >>"$runtime/logs/database-console.log" 2>&1 < /dev/null 9>&- &
    for attempt in {1..30}; do
        if "$database_client" --no-defaults --socket="$database_socket" --user="$database_admin" --batch --skip-column-names -e 'SELECT 1' >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    "$database_client" --no-defaults --socket="$database_socket" --user="$database_admin" --batch --skip-column-names -e 'SELECT 1' >/dev/null
fi

start_process() {
    local name="$1"
    shift
    local pid_file="$runtime/run/$name.pid"
    if [[ -f "$pid_file" ]]; then
        local existing_pid
        existing_pid="$(cat "$pid_file")"
        if [[ "$existing_pid" =~ ^[0-9]+$ ]] && kill -0 "$existing_pid" 2>/dev/null; then
            if [[ "$(readlink -f "/proc/$existing_pid/cwd")" == "$project_root" ]]; then
                return
            fi
            echo "PID $name bertabrakan dengan proses lain; tidak diubah." >&2
            exit 1
        fi
    fi
    setsid "$@" >>"$runtime/logs/$name.log" 2>&1 < /dev/null 9>&- &
    echo "$!" > "$pid_file"
}

if [[ ! -f "$runtime/run/web.pid" ]] && ss -ltnH 'sport = :18080' | grep -q .; then
    echo 'Port web 18080 sedang dipakai; layanan tersebut tidak diubah.' >&2
    exit 1
fi

export PHP_CLI_SERVER_WORKERS=4
start_process web php -d "sys_temp_dir=$TMPDIR" -d "upload_tmp_dir=$TMPDIR" artisan serve --host=127.0.0.1 --port=18080 --tries=1 --no-reload --no-interaction
start_process scheduler php -d "sys_temp_dir=$TMPDIR" artisan schedule:work --no-interaction

for attempt in {1..30}; do
    if curl -fsS --max-time 2 http://127.0.0.1:18080/up >/dev/null 2>&1; then
        echo 'Absensi aktif di http://127.0.0.1:18080; database dan scheduler berjalan.'
        echo 'Cloudflare Service URL: http://127.0.0.1:18080'
        tunnel_name=quick-tunnel
        tunnel_port=18181
        tunnel_arguments=(--url http://127.0.0.1:18080)
        if [[ -s "$runtime/cloudflared/token" ]]; then
            tunnel_name=tunnel-us
            tunnel_port=18185
            chmod 600 "$runtime/cloudflared/token"
            tunnel_arguments=(run --token-file "$runtime/cloudflared/token")
        fi
        if [[ -f "$runtime/run/$tunnel_name.pid" ]] || ! ss -ltnH "sport = :$tunnel_port" | grep -q .; then
            mkdir -p "$runtime/cloudflared"
            if [[ ! -f "$runtime/cloudflared/config.yml" ]]; then
                printf '{}\n' > "$runtime/cloudflared/config.yml"
            fi
            start_process "$tunnel_name" cloudflared tunnel \
                --config "$runtime/cloudflared/config.yml" \
                --origincert "$runtime/cloudflared/cert.pem" --no-autoupdate \
                --protocol quic --quic-disable-pmtu-discovery --region us --edge-ip-version 4 --metrics "127.0.0.1:$tunnel_port" \
                --rpc-timeout 60s --dial-edge-timeout 60s --heartbeat-count 10 --retries 100 \
                --grace-period 5s \
                --pidfile "$runtime/run/$tunnel_name.pid" "${tunnel_arguments[@]}"
            for tunnel_attempt in {1..30}; do
                if curl -fsS --max-time 2 "http://127.0.0.1:$tunnel_port/ready" >/dev/null 2>&1; then
                    if [[ "$tunnel_name" == tunnel-us ]]; then
                        echo 'Tunnel domain utama tersambung. Periksa https://absensi.chfitra.my.id'
                    else
                        echo 'Alamat online sementara (berubah jika tunnel dibuat ulang):'
                        grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$runtime/logs/quick-tunnel.log" | tail -n 1
                    fi
                    exit 0
                fi
                sleep 1
            done
            echo "Tunnel belum tersambung. Periksa .runtime/logs/$tunnel_name.log." >&2
            exit 1
        fi
        echo "Port tunnel $tunnel_port sedang dipakai layanan lain; tidak diubah." >&2
        exit 0
    fi
    sleep 1
done
echo 'Web belum siap. Periksa .runtime/logs/web.log.' >&2
exit 1
