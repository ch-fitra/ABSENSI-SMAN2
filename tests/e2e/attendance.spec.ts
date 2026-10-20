import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { chooseOption } from "./select-helpers";

async function teacherLogin(page: Page) {
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
    ).toBeVisible({ timeout: 15000 });
}
async function noOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
    ).toBe(true);
}

test("alur guru dan siswa, konfirmasi, koreksi, PDF, serta tampilan responsif", async ({
    page,
    browser,
}, testInfo) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mkdir(".runtime/screenshots", { recursive: true });
    await page.goto("/");
    await expect(
        page.getByRole("heading", { name: /Awali pelajaran/ }),
    ).toBeVisible();
    await noOverflow(page);
    await expect(page.locator(".welcome-copy")).toHaveCSS("opacity", "1");
    await page.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-welcome.png`,
        fullPage: true,
    });
    await teacherLogin(page);
    await noOverflow(page);
    if (testInfo.project.name === "mobile") {
        const menuButton = page.getByRole("button", {
            name: "Buka navigasi",
            exact: true,
        });
        await menuButton.click();
        await expect(page.locator("#app-sidebar .brand")).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(
            page.getByRole("button", { name: "Keluar dari akun", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(menuButton).toBeFocused();
    }
    await expect(page.locator(".stat-card").last()).toHaveCSS("opacity", "1");
    await page.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-teacher-dashboard.png`,
        fullPage: true,
    });
    await page
        .getByRole("button", { name: "Mulai Absensi", exact: true })
        .click();
    const methodDialog = page.getByRole("dialog", { name: "Mulai absensi dengan cara apa?" });
    await expect(methodDialog).toBeVisible();
    await expect(methodDialog).toHaveCSS("opacity", "1");
    await noOverflow(page);
    await page.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-attendance-method.png`,
        fullPage: true,
    });
    await methodDialog.getByRole("link", { name: /Absensi via Link/ }).click();
    await expect(page).toHaveURL(/\/guru\/absensi-link\/buat$/);
    await page.goto("/guru");
    const startAttendance = page.getByRole("button", { name: "Mulai Absensi", exact: true });
    await startAttendance.click();
    await page.keyboard.press("Escape");
    await expect(methodDialog).not.toBeVisible();
    await expect(startAttendance).toBeFocused();
    await startAttendance.click();
    await methodDialog.getByRole("link", { name: /Buka Sesi Absen/ }).click();
    await expect(page).toHaveURL(/\/guru\/absensi\/buat$/);
    await chooseOption(page, page.getByRole("combobox", { name: "Kelas", exact: true }), "X-1 · 3 siswa aktif");
    await page
        .getByRole("combobox", { name: "Mata pelajaran", exact: true })
        .fill(`Matematika ${testInfo.project.name}`);
    await page
        .getByRole("button", { name: "Mulai Absensi", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Kehadiran siswa", exact: true }),
    ).toBeVisible();
    const sessionId = page.url().split("/").pop()!;
    await expect(page.getByRole("timer")).not.toHaveText("00:00");
    await noOverflow(page);
    await page.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-active-session.png`,
        fullPage: true,
    });
    const studentContext = await browser.newContext({
        baseURL: "http://127.0.0.1:8001",
        viewport:
            testInfo.project.name === "mobile"
                ? { width: 390, height: 844 }
                : { width: 1280, height: 800 },
    });
    const student = await studentContext.newPage();
    student.on("pageerror", (error) => errors.push(error.message));
    await student.goto("/siswa/masuk");
    await student.getByLabel("NISN", { exact: true }).fill("0012345671");
    await student
        .getByRole("button", { name: "Masuk sebagai Siswa", exact: true })
        .click();
    await expect(
        student.getByRole("heading", {
            name: "Halo, Alya Putri.",
            exact: true,
        }),
    ).toBeVisible();
    await student.goto(`/siswa/absensi/${sessionId}`);
    await student.getByRole("radio", { name: "Hadir", exact: true }).check();
    await student
        .getByRole("button", { name: "Kirim Absensi", exact: true })
        .click();
    await expect(
        student.getByRole("heading", {
            name: "Absensi berhasil dikirim",
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        student.getByRole("button", { name: "Kirim Absensi", exact: true }),
    ).toHaveCount(0);
    await noOverflow(student);
    await student.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-submission-success.png`,
        fullPage: true,
    });
    await page.getByRole("button", { name: "Tutup Sesi", exact: true }).click();
    await page
        .getByRole("button", { name: "Ya, Tutup Sesi", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Periksa kehadiran", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("combobox", { name: "Status Alya Putri", exact: true }),
    ).toContainText("Hadir");
    await page
        .getByRole("button", { name: "Konfirmasi Absensi", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Ya, Konfirmasi", exact: true })
        .click();
    await expect(
        page.getByRole("link", { name: "Unduh PDF", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Konfirmasi Absensi", exact: true }),
    ).toHaveCount(0);
    await chooseOption(page, page.getByRole("combobox", { name: "Status Bima Pratama", exact: true }), "Sakit");
    await page
        .getByLabel("Keterangan Bima Pratama", { exact: true })
        .fill("Demam, dikoreksi guru");
    await page
        .getByRole("button", { name: "Simpan Koreksi", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Catatan perubahan", exact: true }),
    ).toBeVisible();
    const teacherDownload = page.waitForEvent("download");
    await page.getByRole("link", { name: "Unduh PDF", exact: true }).click();
    await (
        await teacherDownload
    ).saveAs(
        `.runtime/screenshots/${testInfo.project.name}-teacher-report.pdf`,
    );
    await student.reload();
    await expect(
        student.getByRole("heading", {
            name: "Hasil kehadiran resmi",
            exact: true,
        }),
    ).toBeVisible();
    const studentDownload = student.waitForEvent("download");
    await student
        .getByRole("link", { name: "Unduh PDF Sesi Ini", exact: true })
        .click();
    await (
        await studentDownload
    ).saveAs(
        `.runtime/screenshots/${testInfo.project.name}-student-report.pdf`,
    );
    await page.goto("/guru/siswa");
    await noOverflow(page);
    await page
        .getByRole("button", { name: "Tambah Kelas", exact: true })
        .click();
    await page
        .getByLabel("Nama kelas", { exact: true })
        .fill(`XI-${testInfo.project.name}`);
    await page
        .getByRole("button", { name: "Simpan Kelas", exact: true })
        .click();
    await expect(
        page.getByText("Kelas berhasil ditambahkan.", { exact: true }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Tambah Siswa", exact: true })
        .click();
    await page
        .getByLabel("NISN", { exact: true })
        .fill(testInfo.project.name === "mobile" ? "0012345681" : "0012345680");
    await page
        .getByLabel("Nama lengkap", { exact: true })
        .fill("Siswa Uji Browser");
    const studentClass = page.getByRole("combobox", { name: "Kelas", exact: true }).last();
    await studentClass.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Simpan Siswa", exact: true })).toBeVisible();
    await chooseOption(page, studentClass, `XI-${testInfo.project.name}`);
    await page
        .getByRole("button", { name: "Simpan Siswa", exact: true })
        .click();
    await expect(
        page.getByText("Siswa berhasil ditambahkan ke daftar bersama.", {
            exact: true,
        }),
    ).toBeVisible();
    await chooseOption(page, page.getByRole("combobox", { name: "Kelas tujuan", exact: true }), `XI-${testInfo.project.name}`);
    await page
        .getByLabel("File Excel", { exact: true })
        .setInputFiles(`.runtime/browser-import-${testInfo.project.name}.xlsx`);
    await page
        .getByRole("button", { name: "Periksa File", exact: true })
        .click();
    await expect(
        page.getByRole("heading", {
            name: `Pratinjau impor · XI-${testInfo.project.name}`,
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        page.getByText("NISN duplikat; baris ini tidak akan diimpor.", {
            exact: true,
        }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Konfirmasi Impor 1 Siswa", exact: true })
        .click();
    await expect(
        page.getByText(
            "1 siswa berhasil diimpor. 1 baris tidak valid atau duplikat dilewati.",
            { exact: true },
        ),
    ).toBeVisible();
    await page.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-roster.png`,
        fullPage: true,
    });
    await page
        .getByRole("button", { name: "Gunakan mode gelap", exact: true })
        .click();
    await expect(page.locator("html")).toHaveClass("dark");
    await noOverflow(page);
    await expect(page.locator(".button-outline").first()).toHaveCSS(
        "background-color",
        "rgb(20, 36, 52)",
    );
    await page.screenshot({
        path: `.runtime/screenshots/${testInfo.project.name}-dark-roster.png`,
        fullPage: true,
    });
    expect(errors).toEqual([]);
    await studentContext.close();
});
