import { Head, Link } from "@inertiajs/react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ status }: { status: number }) {
    const messages: Record<number, [string, string]> = {
        403: [
            "Akses tidak diizinkan",
            "Anda tidak memiliki izin untuk membuka data ini.",
        ],
        404: [
            "Halaman tidak ditemukan",
            "Halaman atau data yang Anda cari tidak tersedia.",
        ],
        419: [
            "Sesi Anda telah berakhir",
            "Muat ulang halaman dan masuk kembali untuk melanjutkan.",
        ],
        429: [
            "Terlalu banyak permintaan",
            "Tunggu satu menit sebelum mencoba kembali.",
        ],
        500: [
            "Terjadi kendala pada server",
            "Silakan coba lagi beberapa saat atau hubungi pengelola server.",
        ],
        503: [
            "Sedang dalam pemeliharaan",
            "Kami akan segera kembali. Silakan coba beberapa saat lagi.",
        ],
    };
    const [title, description] = messages[status] ?? messages[500];
    return (
        <main className="error-page">
            <Head title={title} />
            <CircleAlert size={44} />
            <span className="eyebrow">{status}</span>
            <h1>{title}</h1>
            <p className="muted">{description}</p>
            <div className="button-row">
                <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                >
                    <RefreshCw size={17} />
                    Muat ulang
                </Button>
                <Button asChild>
                    <Link href="/">Kembali ke beranda</Link>
                </Button>
            </div>
        </main>
    );
}
