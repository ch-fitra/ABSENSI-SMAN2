import { Link } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowUpRight,
    Download,
    MessageSquare,
    QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { PageHeader } from "@/components/shared";
import {
    CopyPublicLink,
    PublicCountdown,
    PublicFormStatus,
} from "@/components/public-attendance";
import { Button } from "@/components/ui/button";
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
    function download() {
        try {
            if (!qr.current) return;
            const svg = qr.current.cloneNode(true) as SVGSVGElement;
            svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            svg.setAttribute("width", "1024");
            svg.setAttribute("height", "1024");
            const url = URL.createObjectURL(
                new Blob([new XMLSerializer().serializeToString(svg)], {
                    type: "image/svg+xml;charset=utf-8",
                }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = `qr-absensi-${form.id}.svg`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setDownloadError("QR belum dapat diunduh. Silakan coba kembali.");
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
                        <QRCodeSVG
                            ref={qr}
                            value={form.public_url}
                            size={256}
                            level="M"
                            marginSize={4}
                            title={`QR formulir ${form.title}`}
                        />
                    </div>
                    <h3>Buka kamera, pindai QR.</h3>
                    <p className="muted">
                        Langsung ke formulir. Siswa tidak perlu login.
                    </p>
                    <Button type="button" onClick={download} variant="outline">
                        <Download size={17} />
                        Unduh QR Code
                    </Button>
                    {downloadError && (
                        <p className="field-error" role="alert">
                            {downloadError}
                        </p>
                    )}
                    <small className="muted">
                        Format SVG · tetap tajam saat dicetak
                    </small>
                </aside>
            </div>
        </AppLayout>
    );
}
