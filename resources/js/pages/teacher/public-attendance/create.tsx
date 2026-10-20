import { Link, useForm } from "@inertiajs/react";
import { ArrowLeft, Clock3, Link2, QrCode, Share2 } from "lucide-react";
import type { FormEvent } from "react";
import AppLayout from "@/layouts/app-layout";
import { Errors, Field, Loading, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function CreatePublicForm({ storeUrl }: { storeUrl: string }) {
    const form = useForm({ title: "", duration_minutes: 30 });
    function submit(event: FormEvent) {
        event.preventDefault();
        if (!form.processing) form.post(storeUrl);
    }
    return (
        <AppLayout title="Buat Link Absensi">
            <PageHeader
                eyebrow="SATU LINK, LEBIH MUDAH"
                title="Buat Link Absensi"
                description="Cukup tentukan judul dan durasi. Formulir langsung siap dibagikan."
            >
                <Button asChild variant="outline">
                    <Link href="/guru/absensi-link">
                        <ArrowLeft size={16} />
                        Kembali ke Daftar Form
                    </Link>
                </Button>
            </PageHeader>
            <div className="two-column public-create-grid">
                <section className="panel">
                    <div className="section-heading">
                        <h2>Atur formulir Anda</h2>
                        <span className="class-chip">2 langkah sederhana</span>
                    </div>
                    <form className="form-stack" onSubmit={submit}>
                        <Errors errors={form.errors} />
                        <Field label="Judul formulir" error={form.errors.title}>
                            <input
                                autoFocus
                                required
                                maxLength={150}
                                value={form.data.title}
                                onChange={(e) =>
                                    form.setData("title", e.target.value)
                                }
                                placeholder="Contoh: Absensi PJJ Kelas XI"
                            />
                        </Field>
                        <div className="form-stack">
                            <span className="public-field-label">
                                Pilihan durasi
                            </span>
                            <div className="public-duration-options">
                                {[5, 10, 15, 30, 60, 120].map((value) => (
                                    <Button
                                        key={value}
                                        type="button"
                                        variant="outline"
                                        aria-pressed={
                                            form.data.duration_minutes === value
                                        }
                                        className={
                                            form.data.duration_minutes === value
                                                ? "duration-selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            form.setData(
                                                "duration_minutes",
                                                value,
                                            )
                                        }
                                    >
                                        {value} menit
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <Field
                            label="Durasi aktif (menit)"
                            hint="Boleh disesuaikan dari 1 hingga 1.440 menit. Waktu dimulai setelah link berhasil dibuat."
                            error={form.errors.duration_minutes}
                        >
                            <input
                                type="number"
                                required
                                min={1}
                                max={1440}
                                value={form.data.duration_minutes || ""}
                                onChange={(e) =>
                                    form.setData(
                                        "duration_minutes",
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </Field>
                        <Button disabled={form.processing}>
                            {form.processing ? (
                                <Loading text="Membuat link…" />
                            ) : (
                                <>
                                    <QrCode size={18} />
                                    Generate Link & QR Code
                                </>
                            )}
                        </Button>
                    </form>
                </section>
                <aside className="panel public-guide">
                    <span className="public-guide-icon">
                        <Link2 size={27} />
                    </span>
                    <h2>Bagikan. Isi. Tercatat.</h2>
                    <p className="muted">
                        Siswa membuka link atau memindai QR, lalu mengisi tanpa
                        login dan tanpa NISN.
                    </p>
                    <div>
                        <Share2 size={20} />
                        <span>
                            <strong>Satu link untuk satu formulir</strong>
                            <small>
                                Link dan QR tetap sama saat dibuka kembali.
                            </small>
                        </span>
                    </div>
                    <div>
                        <Clock3 size={20} />
                        <span>
                            <strong>Berakhir sesuai durasi</strong>
                            <small>
                                Setelah waktu habis, respons tersimpan tetap
                                dapat dilihat dan diunduh.
                            </small>
                        </span>
                    </div>
                    <p className="public-soft-note">
                        Respons formulir ini memiliki rekap sendiri dan tidak
                        menambah daftar siswa utama.
                    </p>
                </aside>
            </div>
        </AppLayout>
    );
}
