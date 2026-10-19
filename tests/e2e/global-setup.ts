import { execFileSync } from "node:child_process";
export default function setup() {
    const php = process.platform === "win32" ? ".runtime/php/php.exe" : "php";
    execFileSync(php, ["tests/helpers/browser-setup.php"], {
        env: {
            ...process.env,
            APP_ENV: "testing",
            DB_CONNECTION: "mysql",
            DB_DATABASE: process.env.E2E_DB_DATABASE,
        },
        stdio: "pipe",
    });
}
