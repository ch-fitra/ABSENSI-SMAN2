import { Link, useForm, usePage, usePoll } from "@inertiajs/react";
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    Download,
    HeartPulse,
    Send,
} from "lucide-react";
import type { FormEvent } from "react";
import AppLayout from "@/layouts/app-layout";
import {
    AttendanceTimer,
    Errors,
    Field,
    Loading,
    PageHeader,
    StatusBadge,
    SuccessAnimation,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { AttendanceRecord, AttendanceSession, SharedProps } from "@/types";

export default function Attendance({
    session,
    record,
}: {
    session: AttendanceSession;
    record: AttendanceRecord;
}) {
    const { auth } = usePage<SharedProps>().props;
    const form = useForm({ status: "hadir", notes: "" });
    const active = session.status === "active";
    const submitted = !!record.submitted_at;
    const confirmed = !!session.confirmed_at;
    usePoll(
        10000,
        { only: ["session", "record", "serverNow"] },
        { autoStart: !confirmed },
    );
    function submit(e: FormEvent) {
        e.preventDefault();
        form.post(`/siswa/absensi/${session.id}`, { preserveScroll: true });
    }
    return (
        <AppLayout title="Isi Absensi">
            <PageHeader
                eyebrow={`SESI #${session.id} · ${session.class_name_snapshot}`}
                title={session.subject_name}
                description={`Guru: ${session.teacher?.name} · ${formatDate(session.starts_at)}`}
            >
                <Button asChild variant="outline">
                    <Link href="/siswa">
                        <ArrowLeft size={16} />
                        Kembali
                    </Link>
                </Button>
            </PageHeader>
            <section className="panel narrow-panel">
                <div className="flex-between">
                    <StatusBadge status={session.status} />
                    <AttendanceTimer endsAt={session.ends_at} active={active} />
                </div>
                <div className="student-info-grid">
                    <div>
                        <small>Nama siswa</small>
                        <strong>{record.student_name_snapshot}</strong>
                    </div>
                    <div>
                        <small>Kelas saat sesi dibuka</small>
                        <strong>{session.class_name_snapshot}</strong>
                    </div>
                    <div>
                        <small>NISN</small>
                        <strong>{record.nisn_snapshot}</strong>
                    </div>
                    <div>
                        <small>Guru</small>
                        <strong>{session.teacher?.name}</strong>
                    </div>
                </div>
                {submitted || confirmed ? (
                    <div className="success-state">
                        <SuccessAnimation />
                        <h2>
                            {confirmed
                                ? "Hasil kehadiran resmi"
                                : "Absensi berhasil dikirim"}
                        </h2>
                        <p className="muted">
                            {confirmed
                                ? "Kehadiranmu telah dikonfirmasi oleh guru."
                                : "Terima kasih sudah mengisi. Hasil menunggu konfirmasi guru."}
                        </p>
                        <StatusBadge status={record.status} />
                        {record.notes && (
                            <p className="record-notes">{record.notes}</p>
                        )}
                        {record.submitted_at && (
                            <p className="muted">
                                Dikirim {formatDate(record.submitted_at)}
                            </p>
                        )}
                        {confirmed ? (
                            <Button asChild>
                                <a
                                    href={`/siswa/laporan.pdf?session_id=${session.id}`}
                                >
                                    <Download size={17} />
                                    Unduh PDF Sesi Ini
                                </a>
                            </Button>
                        ) : (
                            <Button asChild variant="outline">
                                <Link href="/siswa">Kembali ke Dashboard</Link>
                            </Button>
                        )}
                    </div>
                ) : !active ? (
                    <div className="success-state">
                        <h2>Sesi sudah ditutup</h2>
                        <p className="muted">
                            Waktu pengisian telah berakhir. Hasil kehadiran akan
                            tampil setelah guru mengonfirmasi.
                        </p>
                        <p className="muted">
                            Jika ada kendala, silakan hubungi guru mata
                            pelajaran.
                        </p>
                        <Button asChild variant="outline">
                            <Link href="/siswa">Kembali ke Dashboard</Link>
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="form-stack">
                        <Errors errors={form.errors} />
                        <fieldset>
                            <legend style={{ fontSize: 13, fontWeight: 600 }}>
                                Bagaimana kehadiranmu hari ini?
                            </legend>
                            <div className="status-options">
                                {(
                                    [
                                        ["hadir", "Hadir", CheckCircle2],
                                        ["izin", "Izin", ClipboardCheck],
                                        ["sakit", "Sakit", HeartPulse],
                                    ] as const
                                ).map(([value, label, Icon]) => (
                                    <label
                                        key={value}
                                        className={`status-option ${form.data.status === value ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="status"
                                            value={value}
                                            checked={form.data.status === value}
                                            onChange={() =>
                                                form.setData("status", value)
                                            }
                                            disabled={form.processing}
                                        />
                                        <Icon size={29} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <Field
                            label="Keterangan (opsional)"
                            hint="Tuliskan penjelasan singkat jika diperlukan."
                        >
                            <textarea
                                maxLength={500}
                                value={form.data.notes}
                                onChange={(e) =>
                                    form.setData("notes", e.target.value)
                                }
                                placeholder={
                                    form.data.status === "hadir"
                                        ? "Keterangan tambahan…"
                                        : "Jelaskan alasan izin atau sakit…"
                                }
                                disabled={form.processing}
                            />
                        </Field>
                        <div className="info-note">
                            Periksa pilihanmu sebelum mengirim. Absensi hanya
                            dapat dikirim satu kali pada setiap sesi.
                        </div>
                        <div className="form-footer status-form-footer">
                            <Button disabled={form.processing}>
                                {form.processing ? (
                                    <Loading text="Mengirim absensi…" />
                                ) : (
                                    <>
                                        <Send size={17} />
                                        Kirim Absensi
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </section>
        </AppLayout>
    );
}
