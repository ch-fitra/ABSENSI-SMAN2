import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import jsQR from "jsqr";

for (const title of ["Absensi PJJ Kelas XI", "Pembelajaran bersama seluruh siswa kelas sebelas dengan judul formulir yang panjang untuk memeriksa tata letak kartu absensi dan keterbacaan QR"] ) {
    test(`kartu QR PNG dan SVG dapat dipindai: ${title.slice(0, 30)}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const publicUrl = `https://absensi.chfitra.my.id/form-absensi/${"a".repeat(64)}`;
        const form = {
            id: 999, title, public_url: publicUrl, starts_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(), duration_minutes: 60,
            is_active: true, submissions_count: 0, responses_url: "/guru/absensi-link/999/respons",
            detail_url: "/guru/absensi-link/999", report_url: "/guru/absensi-link/999/laporan.pdf",
        };
        const inertiaPage = {
            component: "teacher/public-attendance/show", url: form.detail_url, version: "qr-test",
            props: { form, auth: { role: "teacher", user: { id: 1, name: "Ibu Ratna", email: "qr@example.test" } },
                flash: {}, errors: {}, serverNow: new Date().toISOString() },
        };
        const manifest = JSON.parse(await readFile("public/build/manifest.json", "utf8"));
        const entry = manifest["resources/js/app.tsx"];
        await page.route("**/*", async (route) => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname.startsWith("/build/assets/")) {
                const filename = path.basename(pathname);
                const extension = path.extname(filename);
                const contentType = extension === ".js" ? "text/javascript" : extension === ".css" ? "text/css" : "font/woff2";
                return route.fulfill({ contentType, body: await readFile(path.join("public/build/assets", filename)) });
            }
            if (route.request().headers()["x-inertia"]) {
                return route.fulfill({ contentType: "application/json", headers: { "X-Inertia": "true" }, body: JSON.stringify(inertiaPage) });
            }
            const data = JSON.stringify(inertiaPage).replaceAll("&", "&amp;").replaceAll("'", "&#39;").replaceAll("<", "&lt;");
            return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1">${entry.css.map((file: string) => `<link rel="stylesheet" href="/build/${file}">`).join("")}</head><body><div id="app" data-page='${data}'></div><script type="module" src="/build/${entry.file}"></script></body></html>` });
        });
        await page.goto("http://127.0.0.1:8001/guru/absensi-link/999");
        await expect(page.getByRole("img", { name: `Kartu QR absensi ${title}`, exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

        for (const format of ["png", "svg"] as const) {
            const downloadEvent = page.waitForEvent("download");
            await page.getByRole("button", { name: format === "png" ? "Unduh QR Code" : "Unduh SVG untuk Cetak", exact: true }).click();
            const download = await downloadEvent;
            expect(download.suggestedFilename()).toBe(`qr-absensi-999.${format}`);
            const output = testInfo.outputPath(`qr.${format}`);
            await download.saveAs(output);
            const bytes = await readFile(output);
            if (format === "png") expect(bytes.subarray(1, 4).toString()).toBe("PNG");
            else {
                expect(bytes.toString()).toContain("SMAN 2");
                expect(bytes.toString()).toContain("Berlaku sampai");
            }
            const pixels = await page.evaluate(async ({ base64, format }) => {
                const image = new Image();
                image.src = `data:image/${format === "svg" ? "svg+xml" : "png"};base64,${base64}`;
                await image.decode();
                const canvas = document.createElement("canvas");
                canvas.width = 720;
                canvas.height = 1000;
                const context = canvas.getContext("2d")!;
                context.drawImage(image, 0, 0, 720, 1000);
                const data = context.getImageData(0, 0, 720, 1000).data;
                let binary = "";
                for (let offset = 0; offset < data.length; offset += 8192) {
                    binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
                }
                return btoa(binary);
            }, { base64: bytes.toString("base64"), format });
            expect(jsQR(new Uint8ClampedArray(Buffer.from(pixels, "base64")), 720, 1000)?.data).toBe(publicUrl);
        }
        await mkdir(".runtime/screenshots", { recursive: true });
        await page.locator(".public-qr").screenshot({ path: `.runtime/screenshots/qr-card-${testInfo.project.name}-${title.length}.png` });
        expect(errors).toEqual([]);
    });
}
