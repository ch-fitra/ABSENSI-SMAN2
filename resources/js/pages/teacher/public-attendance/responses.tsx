import { Link, router, useForm, usePage } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowUpRight,
    Download,
    Filter,
    RotateCcw,
    UsersRound,
} from "lucide-react";
import type { FormEvent } from "react";
import AppLayout from "@/layouts/app-layout";
import {
    EmptyState,
    Errors,
    Field,
    PageHeader,
    PaginationControls,
    Stats,
    StatusBadge,
} from "@/components/shared";
import {
    PublicCountdown,
    PublicFormStatus,
} from "@/components/public-attendance";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { queryString } from "@/lib/utils";
import {
    usePublicFormPolling,
    wibDate,
    wibTime,
} from "@/lib/public-attendance";
import type {
    Pagination,
    PublicAttendanceFilters,
    PublicAttendanceForm,
    PublicAttendanceSubmission,
    SharedProps,
    Summary,
} from "@/types";

export default function Responses({
    form,
    submissions,
    summary,
    filters,
    classes,
}: {
    form: PublicAttendanceForm;
    submissions: Pagination<PublicAttendanceSubmission>;
    summary: Summary;
    filters: PublicAttendanceFilters;
    classes: string[];
}) {
    const { clock, active } = usePublicFormPolling(form.expires_at, [
        "form",
        "submissions",
        "summary",
        "classes",
        "serverNow",
    ]);
    const { errors } = usePage<SharedProps>().props;
    const search = useForm({
        search: filters.search ?? "",
        class_name: filters.class_name ?? "",
        status: filters.status ?? "",
        from: filters.from ?? "",
        to: filters.to ?? "",
    });
    function apply(event: FormEvent) {
        event.preventDefault();
        search.get(form.responses_url, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }
    function reset() {
        search.setData({
            search: "",
            class_name: "",
            status: "",
            from: "",
            to: "",
        });
        router.get(form.responses_url, {}, { preserveScroll: true });
    }
    return (
        <AppLayout title="Respons via Link">
            <PageHeader
                eyebrow="REKAP FORMULIR PUBLIK"
                title={form.title}
                description="Pantau respons siswa dan unduh rekap formulir ini."
            >
                <Button asChild variant="outline">
                    <Link href={active ? form.detail_url : "/guru/absensi-link"}>
                        <ArrowLeft size={16} />
                        {active ? "Link & QR Code" : "Kembali ke Daftar Form"}
                    </Link>
                </Button>
                <Button asChild>
                    <a href={`${form.report_url}?${queryString(filters)}`}>
                        <Download size={17} />
                        Unduh PDF
                    </a>
                </Button>
            </PageHeader>
            <section className="panel public-response-heading">
                <div>
                    <PublicFormStatus active={active} />
                    <p className="muted">
                        {wibDate(form.starts_at)} · {wibTime(form.starts_at)}–
                        {wibTime(form.expires_at)} WIB ·{" "}
                        {form.submissions_count} respons
                    </p>
                    {active && (
                        <Link href={form.detail_url} className="public-text-link">
                            Lihat link dan QR Code
                            <ArrowUpRight size={15} />
                        </Link>
                    )}
                </div>
                <PublicCountdown expiresAt={form.expires_at} clock={clock} />
            </section>
            <Stats summary={summary} confirmed={false} />
            <section className="panel section-space">
                <div className="section-heading">
                    <div>
                        <h2>Daftar respons</h2>
                        <p className="muted">
                            {active
                                ? "Diperbarui otomatis setiap 10 detik."
                                : "Waktu pengisian berakhir. Semua respons tetap tersimpan."}
                        </p>
                    </div>
                    <UsersRound size={22} className="muted" />
                </div>
                <form onSubmit={apply} className="public-response-filters">
                    <Field label="Cari nama siswa">
                        <input
                            placeholder="Ketik nama siswa"
                            maxLength={150}
                            value={search.data.search}
                            onChange={(e) =>
                                search.setData("search", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Kelas">
                        <Select
                            value={search.data.class_name}
                            onChange={(e) =>
                                search.setData("class_name", e.target.value)
                            }
                        >
                            <option value="">Semua kelas</option>
                            {classes.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Status kehadiran">
                        <Select
                            value={search.data.status}
                            onChange={(e) =>
                                search.setData("status", e.target.value)
                            }
                        >
                            <option value="">Semua status</option>
                            {["hadir", "izin", "sakit", "alpa"].map(
                                (status) => (
                                    <option key={status} value={status}>
                                        {status.charAt(0).toUpperCase() +
                                            status.slice(1)}
                                    </option>
                                ),
                            )}
                        </Select>
                    </Field>
                    <Field label="Tanggal awal">
                        <input
                            type="date"
                            value={search.data.from}
                            onChange={(e) =>
                                search.setData("from", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Tanggal akhir">
                        <input
                            type="date"
                            min={search.data.from}
                            value={search.data.to}
                            onChange={(e) =>
                                search.setData("to", e.target.value)
                            }
                        />
                    </Field>
                    <div className="filter-actions">
                        <Button disabled={search.processing} size="sm">
                            <Filter size={15} />
                            Terapkan
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Reset filter"
                            onClick={reset}
                        >
                            <RotateCcw size={16} />
                        </Button>
                    </div>
                </form>
                <Errors errors={errors} />
                <p className="public-soft-note">
                    Ringkasan dan PDF mengikuti filter. Label “Kemungkinan
                    duplikat” menandai nama dan kelas yang sama; periksa sebelum
                    menarik kesimpulan. Identitas pengisi tidak diverifikasi
                    melalui login.
                </p>
                {submissions.data.length ? (
                    <>
                        <div className="public-response-table-wrap">
                            <table className="public-response-table">
                                <thead>
                                    <tr>
                                        {[
                                            "No.",
                                            "Tanggal",
                                            "Jam WIB",
                                            "Nama siswa",
                                            "Kelas",
                                            "Mata pelajaran",
                                            "Les ke-",
                                            "Status",
                                            "Keterangan",
                                        ].map((label) => (
                                            <th key={label}>{label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.data.map((row, index) => (
                                        <tr key={row.id}>
                                            <td>
                                                {(submissions.current_page -
                                                    1) *
                                                    15 +
                                                    index +
                                                    1}
                                            </td>
                                            <td>{wibDate(row.submitted_at)}</td>
                                            <td>{wibTime(row.submitted_at)}</td>
                                            <td>
                                                <strong>
                                                    {row.student_name}
                                                </strong>
                                                {row.possible_duplicate && (
                                                    <small className="public-duplicate">
                                                        Kemungkinan duplikat
                                                    </small>
                                                )}
                                            </td>
                                            <td>{row.class_name}</td>
                                            <td>{row.subject_name}</td>
                                            <td>{row.lesson_number}</td>
                                            <td>
                                                <StatusBadge
                                                    status={
                                                        row.attendance_status
                                                    }
                                                />
                                            </td>
                                            <td>{row.notes || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="public-response-cards">
                            {submissions.data.map((row, index) => (
                                <article
                                    className="public-response-card"
                                    key={row.id}
                                >
                                    <div className="flex-between">
                                        <span className="class-chip">
                                            #
                                            {(submissions.current_page - 1) *
                                                15 +
                                                index +
                                                1}{" "}
                                            · {row.class_name}
                                        </span>
                                        <StatusBadge
                                            status={row.attendance_status}
                                        />
                                    </div>
                                    <h3>{row.student_name}</h3>
                                    {row.possible_duplicate && (
                                        <small className="public-duplicate">
                                            Kemungkinan duplikat
                                        </small>
                                    )}
                                    <p>
                                        {row.subject_name} · Les ke-
                                        {row.lesson_number}
                                    </p>
                                    <small className="muted">
                                        {wibDate(row.submitted_at)} ·{" "}
                                        {wibTime(row.submitted_at)} WIB
                                    </small>
                                    {row.notes && (
                                        <p className="public-response-notes">
                                            {row.notes}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    </>
                ) : (
                    <EmptyState
                        title="Belum ada respons sesuai filter."
                        description="Respons baru akan muncul di sini setelah siswa mengisi formulir."
                    />
                )}
                <PaginationControls pagination={submissions} />
            </section>
        </AppLayout>
    );
}
