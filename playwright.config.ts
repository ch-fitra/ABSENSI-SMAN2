import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";
import path from "node:path";

process.env.E2E_PASSWORD ??= randomBytes(20).toString("hex");
const php =
    process.platform === "win32" ? path.resolve(".runtime/php/php.exe") : "php";
const database = process.env.E2E_DB_DATABASE ?? "absensi_sman2_browser_test";
if (!database.endsWith("_test"))
    throw new Error("E2E requires a dedicated database ending in _test");
process.env.E2E_DB_DATABASE = database;
export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    workers: 1,
    timeout: 45000,
    globalSetup: "./tests/e2e/global-setup.ts",
    reporter: "list",
    use: {
        baseURL: "http://127.0.0.1:8001",
        channel: "chrome",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        {
            name: "mobile",
            use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
        },
    ],
    webServer: {
        command: `"${php}" artisan serve --host=127.0.0.1 --port=8001 --no-reload`,
        url: "http://127.0.0.1:8001/up",
        reuseExistingServer: false,
        timeout: 30000,
        env: {
            APP_ENV: "local",
            APP_DEBUG: "false",
            APP_URL: "http://127.0.0.1:8001",
            DB_CONNECTION: "mysql",
            DB_DATABASE: database,
            SESSION_DRIVER: "database",
            CACHE_STORE: "database",
            SESSION_SECURE_COOKIE: "false",
        },
    },
});
