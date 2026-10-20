import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chooseOption } from "./select-helpers";

async function openForm(page: Page) {
    const submitted: Record<string, unknown>[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const classes = ["X", "XI", "XII"].flatMap((grade) => Array.from({ length: 8 }, (_, index) => `${grade}-${index + 1}`));
    const subjects = ["Agama", "Bahasa Arab", "Bahasa Indonesia", "Bahasa Inggris", "Bahasa Inggris TL", "Geografi", "Matematika", "Penjaskes", "PKN", "Prakarya", "Sejarah", "Seni Budaya", "Sosiologi", "UPB"];
    const inertiaPage = {
        component: "public-attendance/form", url: "/form-absensi/select-test", version: "select-test",
        props: {
            auth: { role: null, user: null }, flash: {}, errors: {}, serverNow: new Date().toISOString(),
            form: { title: "Absensi Kelas XI", starts_at: new Date().toISOString(), expires_at: new Date(Date.now() + 3600000).toISOString(), duration_minutes: 60 },
            classes, subjects, isActive: true, submitUrl: "/form-absensi/select-test",
            idempotencyKey: "8a6b34ac-c322-4f9f-bbea-6550f1309dad", submittedAt: null as string | null,
        },
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
        if (route.request().method() === "POST") {
            submitted.push(route.request().postDataJSON());
            inertiaPage.props.submittedAt = new Date().toISOString();
        }
        if (route.request().headers()["x-inertia"]) {
            return route.fulfill({ contentType: "application/json", headers: { "X-Inertia": "true" }, body: JSON.stringify(inertiaPage) });
        }
        const data = JSON.stringify(inertiaPage).replaceAll("&", "&amp;").replaceAll("'", "&#39;").replaceAll("<", "&lt;");
        return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1">${entry.css.map((file: string) => `<link rel="stylesheet" href="/build/${file}">`).join("")}</head><body><div id="app" data-page='${data}'></div><script type="module" src="/build/${entry.file}"></script></body></html>` });
    });
    await page.goto("http://127.0.0.1:8001/form-absensi/select-test");
    await expect(page.getByRole("combobox", { name: "Tingkat kelas", exact: true })).toBeVisible();
    return { submitted, errors };
}

test("dropdown mencari, menandai pilihan, dan mengirim nilai yang benar", async ({ page }) => {
    const { submitted, errors } = await openForm(page);
    const classSelect = page.getByRole("combobox", { name: "Tingkat kelas", exact: true });
    await classSelect.click();
    const search = page.getByRole("searchbox");
    await search.fill("kelas tidak ada");
    await expect(page.getByText("Tidak ada pilihan yang cocok.")).toBeVisible();
    await search.fill("  xi-8  ");
    await expect(page.getByRole("option")).toHaveText(["XI-8"]);
    await page.getByRole("option", { name: "XI-8", exact: true }).click();
    await expect(classSelect).toContainText("XI-8");
    await classSelect.click();
    await expect(page.getByRole("searchbox")).toHaveValue("");
    await expect(page.getByRole("option", { name: "XI-8", exact: true })).toHaveAttribute("aria-selected", "true");
    await classSelect.press("Escape");
    await expect(classSelect).toBeFocused();
    await expect(classSelect).toHaveAttribute("aria-expanded", "false");

    await page.getByLabel("Nama lengkap siswa").fill("Alya Putri");
    await page.getByRole("radio", { name: "Hadir", exact: true }).check();
    await page.getByRole("button", { name: "Simpan Absensi", exact: true }).click();
    expect(submitted).toHaveLength(0);
    await expect(page.getByRole("combobox", { name: "Mata pelajaran", exact: true })).toBeFocused();
    await page.getByRole("option", { name: "Matematika", exact: true }).click();
    await chooseOption(page, page.getByRole("combobox", { name: "Les ke-", exact: true }), "Les ke-20");
    await page.getByRole("button", { name: "Simpan Absensi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Absensi berhasil disimpan!", exact: true })).toBeVisible();
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({ class_name: "XI-8", subject_name: "Matematika", lesson_number: "20" });
    expect(errors).toEqual([]);
});

test("dropdown mendukung keyboard, Escape, Tab, dan klik di luar", async ({ page }) => {
    const { errors } = await openForm(page);
    const lesson = page.getByRole("combobox", { name: "Les ke-", exact: true });
    await lesson.focus();
    await lesson.press("ArrowDown");
    await expect(lesson).toHaveAttribute("aria-expanded", "true");
    await lesson.press("End");
    await lesson.press("Enter");
    await expect(lesson).toContainText("Les ke-20");
    await lesson.press("ArrowUp");
    await lesson.press("Home");
    await lesson.press("Escape");
    await expect(lesson).toContainText("Les ke-20");
    await lesson.click();
    await lesson.click();
    await expect(lesson).toHaveAttribute("aria-expanded", "false");

    const subject = page.getByRole("combobox", { name: "Mata pelajaran", exact: true });
    await subject.focus();
    await subject.press("m");
    await subject.press("Enter");
    await expect(subject).toContainText("Matematika");
    await subject.click();
    await page.getByRole("heading", { name: "Absensi Kelas XI", exact: true }).click();
    await expect(subject).toHaveAttribute("aria-expanded", "false");
    await subject.focus();
    await subject.press("ArrowDown");
    await subject.press("Tab");
    await expect(page.getByRole("searchbox")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(subject).toHaveAttribute("aria-expanded", "false");
    expect(errors).toEqual([]);
});

test("dropdown tetap di layar dan terbaca pada mode terang, gelap, serta reduced motion", async ({ page }, testInfo) => {
    const { errors } = await openForm(page);
    await mkdir(".runtime/screenshots", { recursive: true });
    for (const theme of ["light", "dark"]) {
        if (theme === "dark") await page.getByRole("button", { name: "Gunakan mode gelap", exact: true }).click();
        const subject = page.getByRole("combobox", { name: "Mata pelajaran", exact: true });
        await subject.click();
        const menu = page.locator(".select-menu:popover-open");
        await expect(menu).toBeVisible();
        const box = (await menu.boundingBox())!;
        const viewport = page.viewportSize()!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        expect(box.height).toBeLessThanOrEqual(361);
        await page.screenshot({ path: `.runtime/screenshots/select-${testInfo.project.name}-${theme}.png`, fullPage: true, animations: "disabled" });
        await subject.press("Escape");
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("combobox", { name: "Tingkat kelas", exact: true }).click();
    expect(await page.locator(".select-menu:popover-open").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    expect(errors).toEqual([]);
});

