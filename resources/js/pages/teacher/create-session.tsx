import { Link, useForm } from "@inertiajs/react";
import { ArrowLeft, Plus, Play } from "lucide-react";
import type { FormEvent } from "react";
import AppLayout from "@/layouts/app-layout";
import {
    EmptyState,
    Errors,
    Field,
    Loading,
    PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { SchoolClass } from "@/types";

export default function CreateSession({
    classes,
    subjects,
}: {
    classes: SchoolClass[];
    subjects: string[];
}) {
    const form = useForm({
        class_id: "",
        subject_name: "",
        duration_minutes: 5,
    });
    function submit(e: FormEvent) {
        e.preventDefault();
        form.post("/guru/absensi");
    }
    return (
        <AppLayout title="Mulai Absensi">
            <PageHeader
                eyebrow="ABSENSI KELAS"
                title="Mulai dari kehadiran."
                description="Cukup pilih kelas, tulis mata pelajaran, dan tentukan durasi."
            />
            <div className="two-column">
                <section className="panel">
                    <div className="section-heading">
                        <h2>Sesi absensi baru</h2>
                        <span className="class-chip">3 langkah sederhana</span>
                    </div>
                    {!classes.length ? (
                        <EmptyState
                            title="Tambahkan kelas terlebih dahulu"
                            description="Buat kelas dan tambahkan siswa di Data Siswa untuk memulai absensi."
                        >
                            <Button asChild>
                                <Link href="/guru/siswa">
                                    <Plus size={17} />
                                    Buka Data Siswa
                                </Link>
                            </Button>
                        </EmptyState>
                    ) : (
                        <form className="form-stack" onSubmit={submit}>
                            <Errors errors={form.errors} />
                            <Field label="Kelas">
                                <select
                                    required
                                    value={form.data.class_id}
                                    onChange={(e) =>
                                        form.setData("class_id", e.target.value)
                                    }
                                >
                                    <option value="">
                                        Pilih kelas yang akan diabsen
                                    </option>
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} · {c.students_count} siswa
                                            aktif
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="Mata pelajaran"
                                hint="Tuliskan mata pelajaran yang sedang Anda ajarkan."
                            >
                                <input
                                    required
                                    maxLength={120}
                                    list="subjects"
                                    value={form.data.subject_name}
                                    onChange={(e) =>
                                        form.setData(
                                            "subject_name",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Contoh: Matematika"
                                />
                                <datalist id="subjects">
                                    {subjects.map((s) => (
                                        <option key={s} value={s} />
                                    ))}
                                </datalist>
                            </Field>
                            <div className="form-stack" style={{ gap: 10 }}>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>
                                    Durasi pengisian
                                </span>
                                <div className="duration-options">
                                    {[5, 10, 15, 30].map((minutes) => (
                                        <Button
                                            key={minutes}
                                            type="button"
                                            variant="outline"
                                            className={
                                                form.data.duration_minutes ===
                                                minutes
                                                    ? "duration-selected"
                                                    : ""
                                            }
                                            onClick={() =>
                                                form.setData(
                                                    "duration_minutes",
                                                    minutes,
                                                )
                                            }
                                        >
                                            {minutes} menit
                                        </Button>
                                    ))}
                                </div>
                                <Field
                                    label="Durasi lainnya (menit)"
                                    hint="Antara 1–120 menit. Sesi ditutup otomatis saat waktu habis."
                                >
                                    <input
                                        type="number"
                                        min={1}
                                        max={120}
                                        required
                                        value={form.data.duration_minutes}
                                        onChange={(e) =>
                                            form.setData(
                                                "duration_minutes",
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                            <div className="info-note">
                                Daftar siswa disimpan saat sesi dimulai.
                                Perubahan kelas setelahnya tidak mengubah
                                peserta sesi ini.
                            </div>
                            <div className="form-footer">
                                <Button asChild variant="outline">
                                    <Link href="/guru">
                                        <ArrowLeft size={16} />
                                        Kembali
                                    </Link>
                                </Button>
                                <Button disabled={form.processing}>
                                    {form.processing ? (
                                        <Loading text="Membuka sesi…" />
                                    ) : (
                                        <>
                                            <Play size={17} />
                                            Mulai Absensi
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </section>
                <aside className="panel help-panel">
                    <span className="eyebrow">
                        MUDAH DARI AWAL SAMPAI AKHIR
                    </span>
                    <h2>Bagaimana alurnya?</h2>
                    <div className="help-steps">
                        {[
                            [
                                "Buka sesi absensi",
                                "Siswa di kelas pilihan Anda dapat langsung mengisi kehadiran.",
                            ],
                            [
                                "Pantau dan tutup sesi",
                                "Lihat respons siswa. Sesi juga berakhir otomatis sesuai durasi.",
                            ],
                            [
                                "Periksa, lalu konfirmasi",
                                "Siswa yang belum mengisi ditandai Alpa. Periksa hasil sebelum mengonfirmasi.",
                            ],
                        ].map(([title, description], i) => (
                            <div className="help-step" key={title}>
                                <span>{i + 1}</span>
                                <div>
                                    <h3>{title}</h3>
                                    <p>{description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="info-note" style={{ marginTop: 25 }}>
                        Perlu memperbaiki hasil? Koreksi tetap tersedia hingga 7
                        hari setelah sesi ditutup.
                    </p>
                </aside>
            </div>
        </AppLayout>
    );
}
