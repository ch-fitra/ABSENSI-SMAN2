import { expect, test, type Page } from "@playwright/test";
import jsQR from "jsqr";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

async function noOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
    ).toBe(true);
}

async function responsiveTeacherPage(page: Page, project: string) {
    if (project !== "desktop") return;
    const originalViewport = page.viewportSize();
    for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await noOverflow(page);
    }
    if (originalViewport) await page.setViewportSize(originalViewport);
}

test("link dan QR: guru membuat, tamu mengisi, polling rekap, dan PDF", async ({
    page,
    browser,
}, testInfo) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mkdir(".runtime/screenshots", { recursive: true });
    await page.goto("/guru/masuk");
    await page
        .getByLabel("Email", { exact: true })
        .fill("browser.teacher@example.test");
    await page
        .getByLabel("Password", { exact: true })
        .fill(process.env.E2E_PASSWORD!);
    await page
        .getByRole("button", { name: "Masuk sebagai Guru", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Halo, Ibu Ratna." }),
    ).toBeVisible();
    if (testInfo.project.name === "mobile") {
        await page.getByRole("link", { name: "Via Link", exact: true }).click();
    } else
        await page
            .getByRole("link", { name: "Absensi via Link", exact: true })
            .click();
    await expect(
        page.getByRole("heading", { name: "Absensi via Link", exact: true }),
    ).toBeVisible();
    await responsiveTeacherPage(page, testInfo.project.name);
    await page
        .getByRole("link", { name: "Buat Link Absensi", exact: true })
        .first()
        .click();
    await expect(page.getByLabel("Durasi aktif (menit)")).toHaveValue("30");
    await responsiveTeacherPage(page, testInfo.project.name);
    await page
        .getByLabel("Judul formulir")
        .fill(`Absensi PJJ ${testInfo.project.name}`);
    await page.getByLabel("Durasi aktif (menit)").fill("2");
    await page
        .getByRole("button", { name: "Generate Link & QR Code", exact: true })
        .click();
    await expect(
        page.getByRole("heading", {
            name: `Absensi PJJ ${testInfo.project.name}`,
            exact: true,
        }),
    ).toBeVisible();
    await noOverflow(page);
    await responsiveTeacherPage(page, testInfo.project.name);
    const publicUrl = await page
        .getByLabel("Link formulir publik")
        .inputValue();
    expect(publicUrl).toMatch(
        /^http:\/\/127\.0\.0\.1:8001\/form-absensi\/[a-f0-9]{64}$/,
    );
    await page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Salin Link", exact: true }).click();
    await expect(
        page.getByText("Link berhasil disalin.", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        publicUrl,
    );
    const qrEvent = page.waitForEvent("download");
    await page
        .getByRole("button", { name: "Unduh QR Code", exact: true })
        .click();
    const qr = await qrEvent;
    const qrPath = `.runtime/screenshots/${testInfo.project.name}-public-qr.svg`;
    await qr.saveAs(qrPath);
    const qrText = await readFile(qrPath, "utf-8");
    const pixels = await page.evaluate(async (svg) => {
        const image = new Image();
        const blob = URL.createObjectURL(
            new Blob([svg], { type: "image/svg+xml" }),
        );
        try {
            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = reject;
                image.src = blob;
            });
            const canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext("2d")!;
            context.drawImage(image, 0, 0, 512, 512);
            const data = context.getImageData(0, 0, 512, 512).data;
            let binary = "";
            for (let offset = 0; offset < data.length; offset += 8192) {
                binary += String.fromCharCode(
                    ...data.subarray(offset, offset + 8192),
                );
            }
            return btoa(binary);
        } finally {
            URL.revokeObjectURL(blob);
        }
    }, qrText);
    expect(
        jsQR(new Uint8ClampedArray(Buffer.from(pixels, "base64")), 512, 512)
            ?.data,
    ).toBe(publicUrl);
    await page.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-public-share.png`,
        fullPage: true,
        animations: "disabled",
    });
    await page.reload();
    await expect(page.getByLabel("Link formulir publik")).toHaveValue(
        publicUrl,
    );
    const detailUrl = page.url();
    await page
        .getByRole("link", { name: "Lihat Respons", exact: true })
        .click();
    await page.getByLabel("Cari nama siswa").fill("Alya");
    await page.getByRole("button", { name: "Terapkan", exact: true }).click();
    await expect(page).toHaveURL(/search=Alya/);

    const guestContext = await browser.newContext({
        baseURL: "http://127.0.0.1:8001",
        viewport: { width: 390, height: 844 },
    });
    const guest = await guestContext.newPage();
    guest.on("pageerror", (error) => errors.push(error.message));
    const response = await guest.goto(publicUrl);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(guest.getByLabel("Nama lengkap siswa")).toBeVisible();
    const missingCsrf = await guestContext.request.post(publicUrl, {
        data: { student_name: "Percobaan" },
        headers: { Accept: "application/json" },
    });
    expect(missingCsrf.status()).toBe(419);
    await expect(guest.locator(".sidebar")).toHaveCount(0);
    await expect(guest.getByLabel("Tanggal absensi")).toHaveAttribute(
        "readonly",
        "",
    );
    await expect(guest.getByLabel("Jam absensi (WIB)")).toHaveAttribute(
        "readonly",
        "",
    );
    await guest.getByLabel("Nama lengkap siswa").fill("Alya Putri");
    await guest.getByLabel("Tingkat kelas").selectOption("XI-8");
    const subject = guest.getByRole("combobox", { name: "Mata pelajaran", exact: true });
    await expect(subject).toHaveValue("");
    await expect(subject).toHaveAttribute("required", "");
    await expect(subject.locator("option")).toHaveText([
        "Pilih mata pelajaran", "Agama", "Bahasa Arab", "Bahasa Indonesia",
        "Bahasa Inggris", "Bahasa Inggris TL", "Geografi", "Matematika",
        "Penjaskes", "PKN", "Prakarya", "Sejarah", "Seni Budaya", "Sosiologi", "UPB",
    ]);
    await subject.selectOption("Bahasa Inggris TL");
    await expect(subject).toHaveValue("Bahasa Inggris TL");
    await subject.selectOption("Matematika");
    await guest.getByLabel("Les ke-", { exact: true }).selectOption("20");
    await guest.getByRole("radio", { name: "Hadir", exact: true }).check();
    await guest.getByLabel("Keterangan (opsional)").fill("Belajar dari rumah.");
    await noOverflow(guest);
    await guest.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-public-form.png`,
        fullPage: true,
        animations: "disabled",
    });
    await guest
        .getByRole("button", { name: "Simpan Absensi", exact: true })
        .click();
    await expect(
        guest.getByRole("heading", {
            name: "Absensi berhasil disimpan!",
            exact: true,
        }),
    ).toBeVisible();
    await expect(guest).toHaveURL(publicUrl);
    await guest.reload();
    await expect(
        guest.getByRole("heading", {
            name: "Absensi berhasil disimpan!",
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        page.getByText("Alya Putri", { exact: true }).filter({ visible: true }),
    ).toBeVisible({ timeout: 16000 });
    await expect(page.getByLabel("Cari nama siswa")).toHaveValue("Alya");
    await expect(page).toHaveURL(/search=Alya/);
    await responsiveTeacherPage(page, testInfo.project.name);
    await noOverflow(page);
    await page.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-public-responses.png`,
        fullPage: true,
        animations: "disabled",
    });
    const pdfEvent = page.waitForEvent("download");
    await page.getByRole("link", { name: "Unduh PDF", exact: true }).click();
    const pdf = await pdfEvent;
    const pdfPath = `.runtime/screenshots/${testInfo.project.name}-public-report.pdf`;
    await pdf.saveAs(pdfPath);
    expect((await readFile(pdfPath)).subarray(0, 5).toString()).toBe("%PDF-");
    await page
        .getByRole("button", { name: "Gunakan mode gelap", exact: true })
        .click();
    await expect(page.locator("html")).toHaveClass("dark");
    await responsiveTeacherPage(page, testInfo.project.name);

    // A fresh visitor receives the form, never another visitor's receipt or response.
    const secondContext = await browser.newContext({
        baseURL: "http://127.0.0.1:8001",
        viewport: { width: 360, height: 800 },
        reducedMotion: "reduce",
    });
    const second = await secondContext.newPage();
    second.on("pageerror", (error) => errors.push(error.message));
    await second.goto(publicUrl);
    await expect(second.getByLabel("Nama lengkap siswa")).toHaveValue("");
    await expect(second.getByText("Alya Putri", { exact: true })).toHaveCount(
        0,
    );
    for (const width of [360, 390, 768, 1024, 1440]) {
        await second.setViewportSize({ width, height: 900 });
        await noOverflow(second);
        await second.screenshot({
            path: `.runtime/screenshots/${testInfo.project.name}-public-${width}.png`,
            fullPage: true,
            animations: "disabled",
        });
    }
    await second
        .getByRole("button", { name: "Gunakan mode gelap", exact: true })
        .click();
    await expect(second.locator("html")).toHaveClass("dark");
    await noOverflow(second);
    await second.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-public-dark.png`,
        fullPage: true,
        animations: "disabled",
    });
    await second.clock.install();
    await second.clock.fastForward(121000);
    await expect(
        second.getByRole("heading", {
            name: "Formulir Absensi Telah Berakhir",
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        second.getByRole("button", { name: "Simpan Absensi", exact: true }),
    ).toHaveCount(0);

    await page.goto(detailUrl);
    await expect(page.getByLabel("Link formulir publik")).toBeVisible();
    const formId = new URL(detailUrl).pathname.split("/").at(-1)!;
    execFileSync(
        process.platform === "win32" ? ".runtime/php/php.exe" : "php",
        ["tests/helpers/browser-setup.php", "--expire-public-form", formId],
        { env: { ...process.env, APP_ENV: "testing", DB_CONNECTION: "mysql", DB_DATABASE: process.env.E2E_DB_DATABASE } },
    );
    await page.clock.install();
    await page.clock.fastForward(121000);
    await expect(page).toHaveURL(`${detailUrl}/respons`);
    await expect(page.getByRole("heading", { name: "Daftar respons", exact: true })).toBeVisible();
    await expect(page.getByLabel("Link formulir publik")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Unduh QR Code", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Link & QR Code", exact: true })).toHaveCount(0);
    await expect(page.getByText("Alya Putri", { exact: true }).filter({ visible: true })).toBeVisible();
    await page.goto(detailUrl);
    await expect(page).toHaveURL(`${detailUrl}/respons`);
    await page.goto("/guru/absensi-link");
    const expiredCard = page.locator(".public-form-card").filter({ has: page.getByRole("heading", { name: `Absensi PJJ ${testInfo.project.name}`, exact: true }) });
    await expect(expiredCard.getByRole("button", { name: "Salin Link", exact: true })).toHaveCount(0);
    await expiredCard.getByRole("link", { name: "Lihat Respons", exact: true }).click();
    await expect(page).toHaveURL(`${detailUrl}/respons`);
    await page.screenshot({ path: `.runtime/screenshots/${testInfo.project.name}-public-expired-responses.png`, fullPage: true, animations: "disabled" });
    expect(errors).toEqual([]);
    await secondContext.close();
    await guestContext.close();
});
