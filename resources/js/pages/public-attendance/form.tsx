import { useForm } from "@inertiajs/react";
import {
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    HeartPulse,
    Send,
    UserRoundX,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRef, type FormEvent } from "react";
import PublicAttendanceLayout from "@/layouts/public-attendance-layout";
import { Errors, Field, Loading, SuccessAnimation } from "@/components/shared";
import {
    PublicCountdown,
    PublicFormStatus,
} from "@/components/public-attendance";
import { Button } from "@/components/ui/button";
import { useServerClock, wibDate, wibTime } from "@/lib/public-attendance";
import type { AttendanceStatus, PublicAttendanceForm } from "@/types";

export default function PublicForm({
    form,
    isActive,
    classes,
    subjects,
    submitUrl,
    idempotencyKey,
    submittedAt,
}: {
    form: Pick<
        PublicAttendanceForm,
        "title" | "starts_at" | "expires_at" | "duration_minutes"
    >;
    isActive: boolean;
    classes: string[];
    subjects: string[];
    submitUrl: string;
    idempotencyKey: string;
    submittedAt: string | null;
}) {
    const clock = useServerClock();
    const active = isActive && clock < Date.parse(form.expires_at);
    const reduceMotion = useReducedMotion();
    const sending = useRef(false);
    const attendance = useForm({
        student_name: "",
        class_name: "",
        subject_name: "",
        lesson_number: "",
        attendance_status: "" as AttendanceStatus | "",
        notes: "",
        website: "",
        idempotency_key: idempotencyKey,
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        if (!active || attendance.processing || sending.current) return;
        sending.current = true;
        attendance.post(submitUrl, {
            preserveScroll: true,
            onFinish: () => {
                sending.current = false;
            },
            onSuccess: (page) => {
                if (page.props.submittedAt)
                    attendance.reset(
                        "student_name",
                        "class_name",
                        "subject_name",
                        "lesson_number",
                        "attendance_status",
                        "notes",
                    );
            },
        });
    }
    const statuses = [
        ["hadir", "Hadir", CheckCircle2],
        ["izin", "Izin", ClipboardCheck],
        ["sakit", "Sakit", HeartPulse],
        ["alpa", "Alpa", UserRoundX],
    ] as const;
    return (
        <PublicAttendanceLayout title={form.title}>
            <section className="public-form-heading">
                <span className="eyebrow">FORMULIR KEHADIRAN</span>
                <h1>{form.title}</h1>
                <p>Isi data dengan benar, lalu simpan kehadiran Anda.</p>
            </section>
            {submittedAt ? (
                <motion.section
                    className="panel public-notice public-success"
                    role="status"
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <SuccessAnimation />
                    <h1>Absensi berhasil disimpan!</h1>
                    <p className="muted">
                        Terima kasih. Data kehadiran Anda sudah tercatat.
                    </p>
                    <div className="public-success-time">
                        <Clock3 size={17} />
                        {wibDate(submittedAt)} · {wibTime(submittedAt)} WIB
                    </div>
                    <small className="muted">
                        Anda dapat menutup halaman ini.
                    </small>
                </motion.section>
            ) : !active ? (
                <section className="panel public-notice" role="status">
                    <span className="public-notice-icon">
                        <Clock3 size={34} />
                    </span>
                    <h1>Formulir Absensi Telah Berakhir</h1>
                    <p className="muted">
                        Maaf, batas waktu pengisian absensi ini sudah selesai.
                        Silakan hubungi guru yang membagikan link.
                    </p>
                </section>
            ) : (
                <section className="panel public-entry-card">
                    <div className="public-entry-status">
                        <PublicFormStatus active />
                        <PublicCountdown
                            expiresAt={form.expires_at}
                            clock={clock}
                        />
                    </div>
                    <form onSubmit={submit} className="form-stack">
                        <Errors errors={attendance.errors} />
                        <Field
                            label="Nama lengkap siswa"
                            error={attendance.errors.student_name}
                        >
                            <input
                                autoComplete="name"
                                required
                                maxLength={150}
                                placeholder="Masukkan nama lengkap"
                                value={attendance.data.student_name}
                                onChange={(e) =>
                                    attendance.setData(
                                        "student_name",
                                        e.target.value,
                                    )
                                }
                                disabled={attendance.processing}
                            />
                        </Field>
                        <div className="public-input-pair">
                            <Field
                                label="Tingkat kelas"
                                error={attendance.errors.class_name}
                            >
                                <select
                                    required
                                    value={attendance.data.class_name}
                                    onChange={(e) =>
                                        attendance.setData(
                                            "class_name",
                                            e.target.value,
                                        )
                                    }
                                    disabled={attendance.processing}
                                >
                                    <option value="">Pilih kelas</option>
                                    {classes.map((name) => (
                                        <option value={name} key={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Tanggal absensi">
                                <input
                                    readOnly
                                    value={wibDate(clock)}
                                    aria-readonly="true"
                                />
                            </Field>
                        </div>
                        <Field
                            label="Mata pelajaran"
                            error={attendance.errors.subject_name}
                        >
                            <select
                                required
                                value={attendance.data.subject_name}
                                onChange={(e) =>
                                    attendance.setData(
                                        "subject_name",
                                        e.target.value,
                                    )
                                }
                                disabled={attendance.processing}
                            >
                                <option value="">Pilih mata pelajaran</option>
                                {subjects.map((name) => (
                                    <option value={name} key={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="public-input-pair">
                            <Field
                                label="Les ke-"
                                error={attendance.errors.lesson_number}
                            >
                                <select
                                    required
                                    value={attendance.data.lesson_number}
                                    onChange={(e) =>
                                        attendance.setData(
                                            "lesson_number",
                                            e.target.value,
                                        )
                                    }
                                    disabled={attendance.processing}
                                >
                                    <option value="">Pilih les</option>
                                    {Array.from(
                                        { length: 20 },
                                        (_, index) => index + 1,
                                    ).map((value) => (
                                        <option key={value} value={value}>
                                            Les ke-{value}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="Jam absensi (WIB)"
                                hint="Waktu resmi dicatat server saat absensi diterima."
                            >
                                <input
                                    readOnly
                                    value={wibTime(clock)}
                                    aria-readonly="true"
                                />
                            </Field>
                        </div>
                        <fieldset className="public-status-field">
                            <legend>Status kehadiran</legend>
                            <div className="status-options public-status-options">
                                {statuses.map(([value, label, Icon]) => (
                                    <label
                                        key={value}
                                        className={`status-option public-status-${value} ${attendance.data.attendance_status === value ? "selected" : ""}`}
                                    >
                                        <input
                                            required
                                            type="radio"
                                            name="attendance_status"
                                            value={value}
                                            checked={
                                                attendance.data
                                                    .attendance_status === value
                                            }
                                            onChange={() =>
                                                attendance.setData(
                                                    "attendance_status",
                                                    value,
                                                )
                                            }
                                            disabled={attendance.processing}
                                        />
                                        <Icon size={26} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                            {attendance.errors.attendance_status && (
                                <small className="field-error" role="alert">
                                    {attendance.errors.attendance_status}
                                </small>
                            )}
                        </fieldset>
                        <Field
                            label="Keterangan (opsional)"
                            error={attendance.errors.notes}
                        >
                            <textarea
                                placeholder="Opsional, misalnya alasan izin"
                                maxLength={500}
                                value={attendance.data.notes}
                                onChange={(e) =>
                                    attendance.setData("notes", e.target.value)
                                }
                                disabled={attendance.processing}
                            />
                        </Field>
                        <div className="public-honeypot" aria-hidden="true">
                            <label>
                                Biarkan kosong
                                <input
                                    tabIndex={-1}
                                    autoComplete="off"
                                    name="website"
                                    value={attendance.data.website}
                                    onChange={(e) =>
                                        attendance.setData(
                                            "website",
                                            e.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                        <div className="public-submit-footer">
                            <p className="muted">
                                Periksa kembali nama, kelas, dan status
                                kehadiran sebelum menyimpan.
                            </p>
                            <Button disabled={attendance.processing || !active}>
                                {attendance.processing ? (
                                    <Loading text="Menyimpan absensi…" />
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Simpan Absensi
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </section>
            )}
        </PublicAttendanceLayout>
    );
}
