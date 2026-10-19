import { Link, router, useForm, usePoll } from "@inertiajs/react";
import {
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Download,
    LockKeyhole,
    Save,
    Square,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import AppLayout from "@/layouts/app-layout";
import {
    AttendanceTimer,
    Errors,
    Loading,
    PageHeader,
    StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { AttendanceSession, AttendanceStatus } from "@/types";

export default function Session({ session }: { session: AttendanceSession }) {
    const records = session.records ?? [];
    const active = session.status === "active";
    const [dialog, setDialog] = useState<"close" | "confirm" | null>(null);
    const [closing, setClosing] = useState(false);
    const form = useForm({
        records: records.map((r) => ({
            id: r.id,
            status: r.status ?? "alpa",
            notes: r.notes ?? "",
        })),
        confirm: false,
    });
    useEffect(() => {
        form.setData(
            "records",
            records.map((r) => ({
                id: r.id,
                status: r.status ?? "alpa",
                notes: r.notes ?? "",
            })),
        );
    }, [session.closed_at]);
    const poll = usePoll(
        5000,
        {
            only: ["session", "serverNow"],
            onSuccess: (page) => {
                const next = page.props.session as AttendanceSession;
                if (next.status !== "active") {
                    poll.stop();
                }
            },
        },
        { autoStart: active },
    );
    useEffect(() => {
        if (!active) poll.stop();
    }, [active]);
    const submitted = records.filter((r) => r.submitted_at).length;
    const counts = records.reduce(
        (sum, r) => {
            if (r.status) sum[r.status]++;
            return sum;
        },
        { hadir: 0, izin: 0, sakit: 0, alpa: 0 },
    );
    function updateRecord(
        index: number,
        field: "status" | "notes",
        value: string,
    ) {
        form.setData(
            "records",
            form.data.records.map((r, i) =>
                i === index ? { ...r, [field]: value } : r,
            ),
        );
    }
    function save(confirm: boolean) {
        form.transform((data) => ({
            ...data,
            confirm,
            records: session.correction_allowed ? data.records : [],
        }));
        form.put(`/guru/absensi/${session.id}/tinjau`, {
            preserveScroll: true,
            onSuccess: () => setDialog(null),
            onError: () => setDialog(null),
        });
    }
    function closeSession() {
        setClosing(true);
        router.post(
            `/guru/absensi/${session.id}/tutup`,
            {},
            {
                onFinish: () => {
                    setClosing(false);
                    setDialog(null);
                },
            },
        );
    }
    function submit(e: FormEvent) {
        e.preventDefault();
        save(false);
    }
    return (
        <AppLayout title="Detail Absensi">
            <PageHeader
                eyebrow={`SESI ABSENSI #${session.id}`}
                title={session.subject_name}
                description={`${session.class_name_snapshot} · ${session.teacher?.name}`}
            >
                <Button asChild variant="outline">
                    <Link href="/guru/riwayat">Kembali ke riwayat</Link>
                </Button>
                {session.confirmed_at && (
                    <Button asChild>
                        <a href={`/guru/laporan.pdf?session_id=${session.id}`}>
                            <Download size={17} />
                            Unduh PDF
                        </a>
                    </Button>
                )}
            </PageHeader>
            <section className="panel">
                <div className="session-overview">
                    <div>
                        <StatusBadge status={session.status} />
                        <div className="session-meta">
                            <span>
                                <BookOpen size={14} />
                                {session.class_name_snapshot} · {records.length}{" "}
                                siswa
                            </span>
                            <span>
                                <CalendarDays size={14} />
                                {formatDate(session.starts_at)}
                            </span>
                            <span>Berakhir {formatDate(session.ends_at)}</span>
                        </div>
                    </div>
                    <AttendanceTimer endsAt={session.ends_at} active={active} />
                </div>
                <div className="session-progress">
                    <div className="flex-between">
                        <strong style={{ fontSize: 12 }}>
                            {submitted} dari {records.length} siswa telah
                            mengirim
                        </strong>
                        <small className="muted">
                            {records.length - submitted} belum mengirim
                        </small>
                    </div>
                    <div className="progress-track">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${records.length ? (submitted / records.length) * 100 : 0}%`,
                            }}
                        />
                    </div>
                </div>
                <div className="session-breakdown">
                    {Object.entries(counts).map(([status, total]) => (
                        <span key={status}>
                            <StatusBadge status={status as AttendanceStatus} />
                            <strong>{total}</strong>
                        </span>
                    ))}
                </div>
                {active && (
                    <div className="form-footer">
                        <small className="muted">
                            Daftar diperbarui otomatis setiap 5 detik.
                        </small>
                        <Button
                            variant="destructive"
                            onClick={() => setDialog("close")}
                        >
                            <Square size={15} />
                            Tutup Sesi
                        </Button>
                    </div>
                )}
            </section>
            <section className="panel section-space">
                <div className="section-heading">
                    <div>
                        <h2>
                            {active ? "Kehadiran siswa" : "Periksa kehadiran"}
                        </h2>
                        <p className="muted">
                            {active
                                ? "Respons siswa akan muncul setelah berhasil disimpan."
                                : session.correction_allowed
                                  ? `Koreksi tersedia sampai ${formatDate(session.correction_deadline!)}.`
                                  : "Masa koreksi berakhir. Data kehadiran sudah terkunci."}
                        </p>
                    </div>
                    {!active && !session.correction_allowed && (
                        <LockKeyhole size={19} className="muted" />
                    )}
                </div>
                <Errors errors={form.errors} />
                <form onSubmit={submit}>
                    {records.map((record, index) => (
                        <div className="attendance-row" key={record.id}>
                            <div className="student-cell">
                                <span className="avatar">
                                    {(index + 1).toString().padStart(2, "0")}
                                </span>
                                <div>
                                    <strong>
                                        {record.student_name_snapshot}
                                    </strong>
                                    <small>{record.nisn_snapshot}</small>
                                </div>
                            </div>
                            {!active && session.correction_allowed ? (
                                <select
                                    aria-label={`Status ${record.student_name_snapshot}`}
                                    value={
                                        form.data.records[index]?.status ??
                                        record.status ??
                                        "alpa"
                                    }
                                    onChange={(e) =>
                                        updateRecord(
                                            index,
                                            "status",
                                            e.target.value,
                                        )
                                    }
                                >
                                    {["hadir", "izin", "sakit", "alpa"].map(
                                        (status) => (
                                            <option key={status} value={status}>
                                                {status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    status.slice(1)}
                                            </option>
                                        ),
                                    )}
                                </select>
                            ) : (
                                <StatusBadge status={record.status} />
                            )}
                            <div>
                                {!active && session.correction_allowed ? (
                                    <input
                                        aria-label={`Keterangan ${record.student_name_snapshot}`}
                                        maxLength={500}
                                        placeholder="Keterangan (opsional)"
                                        value={
                                            form.data.records[index]?.notes ??
                                            ""
                                        }
                                        onChange={(e) =>
                                            updateRecord(
                                                index,
                                                "notes",
                                                e.target.value,
                                            )
                                        }
                                    />
                                ) : (
                                    <span className="record-notes">
                                        {record.notes ||
                                            (record.submitted_at
                                                ? `Dikirim ${formatDate(record.submitted_at)}`
                                                : "—")}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {!active && (
                        <div className="form-footer">
                            {session.correction_allowed && (
                                <Button
                                    variant="outline"
                                    disabled={form.processing}
                                >
                                    {form.processing ? (
                                        <Loading />
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Simpan Koreksi
                                        </>
                                    )}
                                </Button>
                            )}
                            {!session.confirmed_at ? (
                                <Button
                                    type="button"
                                    onClick={() => setDialog("confirm")}
                                    disabled={form.processing}
                                >
                                    <CheckCircle2 size={17} />
                                    Konfirmasi Absensi
                                </Button>
                            ) : (
                                <span className="text-link">
                                    <CheckCircle2 size={17} />
                                    Dikonfirmasi{" "}
                                    {formatDate(session.confirmed_at)}
                                </span>
                            )}
                        </div>
                    )}
                </form>
            </section>
            {!active && records.some((r) => r.change_logs?.length) && (
                <section className="panel section-space">
                    <h2>Catatan perubahan</h2>
                    <div className="audit-list">
                        {records.flatMap((r) =>
                            (r.change_logs ?? []).map((log) => (
                                <div key={log.id} className="audit-entry">
                                    <strong>
                                        {r.student_name_snapshot} ·{" "}
                                        {log.old_status} → {log.new_status}
                                    </strong>
                                    <p className="muted">
                                        {log.teacher.name} ·{" "}
                                        {formatDate(log.changed_at)}
                                    </p>
                                    {log.old_notes !== log.new_notes && (
                                        <p className="muted">
                                            Keterangan: {log.old_notes || "—"} →{" "}
                                            {log.new_notes || "—"}
                                        </p>
                                    )}
                                </div>
                            )),
                        )}
                    </div>
                </section>
            )}
            <Dialog
                open={dialog !== null}
                onOpenChange={(v) => !v && setDialog(null)}
                title={
                    dialog === "close"
                        ? "Tutup sesi absensi?"
                        : "Konfirmasi kehadiran?"
                }
                description={
                    dialog === "close"
                        ? "Siswa tidak dapat mengisi lagi. Siswa yang belum mengirim akan ditandai Alpa untuk Anda periksa."
                        : "Perubahan akan disimpan dan hasil resmi dapat dilihat oleh siswa. Pastikan status setiap siswa sudah benar."
                }
            >
                <div className="button-row">
                    <Button
                        variant="outline"
                        disabled={closing || form.processing}
                        onClick={() => setDialog(null)}
                    >
                        Batal
                    </Button>
                    <Button
                        variant={dialog === "close" ? "destructive" : "default"}
                        disabled={closing || form.processing}
                        onClick={() =>
                            dialog === "close" ? closeSession() : save(true)
                        }
                    >
                        {closing || form.processing ? (
                            <Loading />
                        ) : dialog === "close" ? (
                            "Ya, Tutup Sesi"
                        ) : (
                            "Ya, Konfirmasi"
                        )}
                    </Button>
                </div>
            </Dialog>
        </AppLayout>
    );
}
