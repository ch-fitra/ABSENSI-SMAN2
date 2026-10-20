import { Link } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowUpRight,
    Download,
    MessageSquare,
    QrCode,
} from "lucide-react";
import { useRef, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { PageHeader } from "@/components/shared";
import {
    CopyPublicLink,
    PublicCountdown,
    PublicFormStatus,
} from "@/components/public-attendance";
import { Button } from "@/components/ui/button";
import { PublicAttendanceQr } from "@/components/public-attendance-qr";
import { downloadPublicQr } from "@/lib/public-attendance-qr";
import {
    usePublicFormPolling,
    wibDate,
    wibTime,
} from "@/lib/public-attendance";
import type { PublicAttendanceForm } from "@/types";

export default function ShowPublicForm({
    form,
}: {
    form: PublicAttendanceForm;
}) {
    const { clock, active } = usePublicFormPolling(form.expires_at, [
        "form",
        "serverNow",
    ]);
    const qr = useRef<SVGSVGElement>(null);
    const [downloadError, setDownloadError] = useState("");
    const [downloading, setDownloading] = useState(false);
    async function download(format: "png" | "svg") {
        if (!qr.current || downloading) return;
        setDownloadError("");
        setDownloading(true);
        try {
            await downloadPublicQr(qr.current, form.id, format);
        } catch {
            setDownloadError("QR belum dapat diunduh. Silakan coba kembali.");
        } finally {
            setDownloading(false);
        }
    }
    const localOnly = ["127.0.0.1", "localhost", "[::1]"].includes(
        new URL(form.public_url).hostname,
    );
    if (!active) {
        return (
            <AppLayout title="Absensi Berakhir">
                <PageHeader
                    eyebrow="WAKTU PENGISIAN BERAKHIR"
                    title={form.title}
                    description="Formulir sudah kedaluwarsa. Mengalihkan ke halaman respons."
                />
                <Button asChild>
                    <Link href={form.responses_url}>
                        Lihat Respons
                        <ArrowUpRight size={16} />
                    </Link>
                </Button>
            </AppLayout>
        );
    }
    return (
        <AppLayout title="Link & QR Absensi">
            <PageHeader
                eyebrow="SIAP DIBAGIKAN"
                title={form.title}
                description="Bagikan link atau tampilkan QR Code kepada siswa."
            >
                <Button asChild variant="outline">
                    <Link href="/guru/absensi-link">
                        <ArrowLeft size={16} />
                        Kembali ke Daftar Form
                    </Link>
                </Button>
            </PageHeader>
            <div className="public-share-grid">
                <section className="panel public-share-card">
                    <div className="flex-between">
                        <PublicFormStatus active={active} />
                        <PublicCountdown
                            expiresAt={form.expires_at}
                            clock={clock}
                        />
                    </div>
                    <h2>Link formulir publik</h2>
                    <CopyPublicLink url={form.public_url} />
                    {localOnly && (
                        <p className="public-soft-note">
                            Untuk dibuka di HP lain, akses situs melalui alamat
                            jaringan atau server yang dapat dijangkau HP
                            tersebut, lalu salin link dari sana.
                        </p>
                    )}
                    <dl className="public-details">
                        <div>
                            <dt>Tanggal dibuat</dt>
                            <dd>{wibDate(form.starts_at)}</dd>
                        </div>
                        <div>
                            <dt>Jam dibuat</dt>
                            <dd>{wibTime(form.starts_at)} WIB</dd>
                        </div>
                        <div>
                            <dt>Durasi aktif</dt>
                            <dd>{form.duration_minutes} menit</dd>
                        </div>
                        <div>
                            <dt>Waktu kedaluwarsa</dt>
                            <dd>
                                {wibDate(form.expires_at)} ·{" "}
                                {wibTime(form.expires_at)} WIB
                            </dd>
                        </div>
                    </dl>
                    <div className="public-response-total">
                        <MessageSquare size={24} />
                        <div>
                            <strong>
                                {form.submissions_count.toLocaleString("id-ID")}
                            </strong>
                            <span>respons tersimpan</span>
                        </div>
                        <Button asChild>
                            <Link href={form.responses_url}>
                                Lihat Respons
                                <ArrowUpRight size={16} />
                            </Link>
                        </Button>
                    </div>
                </section>
                <aside className="panel public-qr-card">
                    <span className="eyebrow">
                        <QrCode size={16} />
                        PINDAI UNTUK MENGISI
                    </span>
                    <div className="public-qr">
                        <PublicAttendanceQr ref={qr} form={form} />
                    </div>
                    <h3>Buka kamera, pindai QR.</h3>
                    <p className="muted">
                        Langsung ke formulir. Siswa tidak perlu login.
                    </p>
                    <Button type="button" onClick={() => download("png")} disabled={downloading}>
                        <Download size={17} />
                        Unduh QR Code
                    </Button>
                    <Button type="button" onClick={() => download("svg")} disabled={downloading} variant="outline">
                        Unduh SVG untuk Cetak
                    </Button>
                    {downloadError && (
                        <p className="field-error" role="alert">
                            {downloadError}
                        </p>
                    )}
                    <small className="muted">
                        PNG untuk dibagikan · SVG untuk dicetak
                    </small>
                </aside>
            </div>
        </AppLayout>
    );
}
