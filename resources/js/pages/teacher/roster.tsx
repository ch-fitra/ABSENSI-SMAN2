import { router, useForm, usePage } from "@inertiajs/react";
import {
    Download,
    FileSpreadsheet,
    Pencil,
    Plus,
    Search,
    Upload,
    Users,
    X,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import AppLayout from "@/layouts/app-layout";
import {
    EmptyState,
    Errors,
    Field,
    Loading,
    PageHeader,
    PaginationControls,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import type {
    Filters,
    Pagination,
    SchoolClass,
    SharedProps,
    Student,
} from "@/types";

type ImportRow = {
    row: number;
    nisn: string;
    full_name: string;
    errors: string[];
};
type ImportPreview = {
    rows: ImportRow[];
    class_id: number;
    class_name: string;
};

function StudentDialog({
    student,
    classes,
    onClose,
}: {
    student: Student | null;
    classes: SchoolClass[];
    onClose: () => void;
}) {
    const form = useForm({
        nisn: student?.nisn ?? "",
        full_name: student?.full_name ?? "",
        class_id: student?.class_id.toString() ?? "",
        is_active: student?.is_active ?? true,
    });
    function submit(e: FormEvent) {
        e.preventDefault();
        if (student)
            form.put(`/guru/siswa/${student.id}`, { onSuccess: onClose });
        else form.post("/guru/siswa", { onSuccess: onClose });
    }
    return (
        <Dialog
            open
            onOpenChange={(v) => !v && onClose()}
            title={student ? "Perbarui data siswa" : "Tambahkan siswa"}
            description="Data digunakan bersama oleh semua guru. Riwayat absensi yang sudah ada tetap tersimpan."
        >
            <form className="form-stack" onSubmit={submit}>
                <Errors errors={form.errors} />
                <Field label="NISN">
                    <input
                        autoFocus
                        required
                        pattern="[0-9]{10}"
                        maxLength={10}
                        inputMode="numeric"
                        placeholder="10 digit NISN"
                        value={form.data.nisn}
                        onChange={(e) =>
                            form.setData(
                                "nisn",
                                e.target.value.replace(/\D/g, ""),
                            )
                        }
                    />
                </Field>
                <Field label="Nama lengkap">
                    <input
                        required
                        maxLength={150}
                        value={form.data.full_name}
                        onChange={(e) =>
                            form.setData("full_name", e.target.value)
                        }
                        placeholder="Nama lengkap siswa"
                    />
                </Field>
                <Field label="Kelas">
                    <Select
                        required
                        value={form.data.class_id}
                        onChange={(e) =>
                            form.setData("class_id", e.target.value)
                        }
                    >
                        <option value="">Pilih kelas</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                {student && (
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(e) =>
                                form.setData("is_active", e.target.checked)
                            }
                        />
                        Siswa aktif (dapat masuk dan mengikuti sesi baru)
                    </label>
                )}
                <div className="button-row">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Batal
                    </Button>
                    <Button disabled={form.processing}>
                        {form.processing ? <Loading /> : "Simpan Siswa"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
function ClassDialog({ onClose }: { onClose: () => void }) {
    const form = useForm({ name: "", grade_level: "X" });
    function submit(e: FormEvent) {
        e.preventDefault();
        form.post("/guru/kelas", { onSuccess: onClose });
    }
    return (
        <Dialog
            open
            onOpenChange={(v) => !v && onClose()}
            title="Tambahkan kelas"
            description="Kelas yang ditambahkan dapat digunakan oleh semua guru."
        >
            <form className="form-stack" onSubmit={submit}>
                <Errors errors={form.errors} />
                <Field label="Tingkat">
                    <Select
                        value={form.data.grade_level}
                        onChange={(e) =>
                            form.setData("grade_level", e.target.value)
                        }
                    >
                        {["X", "XI", "XII"].map((level) => (
                            <option key={level}>{level}</option>
                        ))}
                    </Select>
                </Field>
                <Field label="Nama kelas">
                    <input
                        autoFocus
                        required
                        maxLength={40}
                        placeholder="Contoh: X-1"
                        value={form.data.name}
                        onChange={(e) => form.setData("name", e.target.value)}
                    />
                </Field>
                <div className="button-row">
                    <Button variant="outline" type="button" onClick={onClose}>
                        Batal
                    </Button>
                    <Button disabled={form.processing}>
                        {form.processing ? <Loading /> : "Simpan Kelas"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
export default function Roster({
    students,
    classes,
    filters,
    importPreview,
    importToken,
}: {
    students: Pagination<Student>;
    classes: SchoolClass[];
    filters: Filters;
    importPreview: ImportPreview | null;
    importToken: string | null;
}) {
    const [studentDialog, setStudentDialog] = useState<Student | "new" | null>(
        null,
    );
    const [classDialog, setClassDialog] = useState(false);
    const [importing, setImporting] = useState(false);
    const { errors } = usePage<SharedProps>().props;
    const search = useForm({
        class_id: filters.class_id ?? "",
        search: filters.search ?? "",
    });
    const upload = useForm<{ class_id: string; file: File | null }>({
        class_id: "",
        file: null,
    });
    const fileInput = useRef<HTMLInputElement>(null);
    function preview(e: FormEvent) {
        e.preventDefault();
        upload.post("/guru/impor/pratinjau", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                upload.reset("file");
                if (fileInput.current) fileInput.current.value = "";
            },
        });
    }
    function confirmImport() {
        setImporting(true);
        router.post(
            "/guru/impor",
            { token: importToken },
            { preserveScroll: true, onFinish: () => setImporting(false) },
        );
    }
    const validCount =
        importPreview?.rows.filter((r) => !r.errors.length).length ?? 0;
    return (
        <AppLayout title="Data Siswa">
            <PageHeader
                eyebrow="DIREKTORI BERSAMA"
                title="Data siswa & kelas"
                description="Satu daftar siswa untuk seluruh guru. Tambahkan manual atau impor dari Excel."
            >
                <Button variant="outline" onClick={() => setClassDialog(true)}>
                    <Plus size={17} />
                    Tambah Kelas
                </Button>
                <Button
                    disabled={!classes.length}
                    onClick={() => setStudentDialog("new")}
                >
                    <Plus size={17} />
                    Tambah Siswa
                </Button>
            </PageHeader>
            <Errors errors={errors} />
            <section className="panel">
                <div className="section-heading">
                    <div>
                        <h2>Impor dari Excel</h2>
                        <p className="muted">
                            Unduh template, isi data, lalu periksa pratinjau
                            sebelum menyimpan.
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <a href="/guru/template.xlsx">
                            <Download size={15} />
                            Template Excel
                        </a>
                    </Button>
                </div>
                <div className="import-area">
                    <h3>
                        <FileSpreadsheet
                            size={18}
                            style={{
                                display: "inline",
                                verticalAlign: "middle",
                                marginRight: 7,
                            }}
                        />
                        Tambahkan banyak siswa sekaligus
                    </h3>
                    <p>
                        Format .xlsx · Maksimal 2 MB / 5.000 siswa · NISN
                        harus 10 digit dan tidak duplikat.
                    </p>
                    <form className="import-actions" onSubmit={preview}>
                        <Field label="Kelas tujuan">
                            <Select
                                required
                                value={upload.data.class_id}
                                onChange={(e) =>
                                    upload.setData("class_id", e.target.value)
                                }
                            >
                                <option value="">Pilih kelas</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="File Excel">
                            <div className="file-picker">
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept=".xlsx"
                                    required
                                    onChange={(e) =>
                                        upload.setData(
                                            "file",
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <span>
                                    <Upload size={14} />
                                    Pilih file Excel
                                </span>
                                <small>
                                    {upload.data.file?.name ??
                                        "Belum ada file dipilih"}
                                </small>
                            </div>
                        </Field>
                        <Button disabled={upload.processing || !classes.length}>
                            {upload.processing ? (
                                <Loading text="Memeriksa…" />
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Periksa File
                                </>
                            )}
                        </Button>
                    </form>
                    {upload.progress && (
                        <p className="muted">
                            Mengunggah {upload.progress.percentage}%
                        </p>
                    )}
                </div>
                {importPreview && (
                    <div className="import-preview">
                        <div className="section-heading">
                            <div>
                                <h3>
                                    Pratinjau impor ·{" "}
                                    {importPreview.class_name}
                                </h3>
                                <p className="muted">
                                    {validCount} valid ·{" "}
                                    {importPreview.rows.length - validCount}{" "}
                                    tidak valid / duplikat · Berlaku 15 menit
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Batalkan pratinjau"
                                onClick={() => router.delete("/guru/impor")}
                            >
                                <X size={18} />
                            </Button>
                        </div>
                        <div className="preview-scroll">
                            {importPreview.rows.map((row) => (
                                <div
                                    className={`preview-row ${row.errors.length ? "preview-invalid" : ""}`}
                                    key={row.row}
                                >
                                    <span>{row.row}</span>
                                    <span>{row.nisn}</span>
                                    <strong>
                                        {row.full_name || "Nama kosong"}
                                    </strong>
                                    <span className="preview-message">
                                        {row.errors.length
                                            ? row.errors.join(" ")
                                            : "Siap diimpor"}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="form-footer">
                            <small className="muted">
                                Hanya baris valid yang disimpan. Data lama tidak
                                ditimpa.
                            </small>
                            <Button
                                disabled={!validCount || importing}
                                onClick={confirmImport}
                            >
                                {importing ? (
                                    <Loading />
                                ) : (
                                    `Konfirmasi Impor ${validCount} Siswa`
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </section>
            <section className="panel section-space">
                <div className="section-heading">
                    <div>
                        <h2>Daftar siswa bersama</h2>
                        <p className="muted">
                            {students.total} siswa pada hasil pencarian ·{" "}
                            {classes.length} kelas tersedia
                        </p>
                    </div>
                    <Users size={20} className="muted" />
                </div>
                <form
                    className="filters filters-student"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search.get("/guru/siswa", {
                            preserveState: true,
                            preserveScroll: true,
                        });
                    }}
                >
                    <Field label="Cari siswa">
                        <input
                            placeholder="Nama atau NISN"
                            maxLength={100}
                            value={search.data.search}
                            onChange={(e) =>
                                search.setData("search", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Kelas">
                        <Select
                            value={search.data.class_id}
                            onChange={(e) =>
                                search.setData("class_id", e.target.value)
                            }
                        >
                            <option value="">Semua kelas</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="filter-actions">
                        <Button size="sm">
                            <Search size={15} />
                            Cari
                        </Button>
                        <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => router.get("/guru/siswa")}
                        >
                            Reset
                        </Button>
                    </div>
                </form>
                {students.data.length ? (
                    students.data.map((student, i) => (
                        <div className="roster-row" key={student.id}>
                            <div className="student-cell">
                                <span className="avatar">
                                    {student.full_name
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </span>
                                <div>
                                    <strong>{student.full_name}</strong>
                                    <small>NISN {student.nisn}</small>
                                </div>
                            </div>
                            <span
                                className="muted nisn-cell"
                                style={{ fontSize: 11 }}
                            >
                                {student.nisn}
                            </span>
                            <span className="class-chip">
                                {student.school_class.name}
                            </span>
                            <span
                                className={`badge ${student.is_active ? "badge-hadir" : "badge-alpa"}`}
                            >
                                {student.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStudentDialog(student)}
                                aria-label={`Ubah ${student.full_name}`}
                            >
                                <Pencil size={13} />
                                Ubah
                            </Button>
                        </div>
                    ))
                ) : (
                    <EmptyState
                        title="Belum ada siswa pada daftar ini"
                        description={
                            classes.length
                                ? "Tambahkan siswa secara manual atau gunakan template Excel."
                                : "Mulai dengan menambahkan kelas, lalu masukkan data siswa."
                        }
                    />
                )}
                <PaginationControls pagination={students} />
            </section>
            {studentDialog && (
                <StudentDialog
                    key={studentDialog === "new" ? "new" : studentDialog.id}
                    student={studentDialog === "new" ? null : studentDialog}
                    classes={classes}
                    onClose={() => setStudentDialog(null)}
                />
            )}{" "}
            {classDialog && (
                <ClassDialog onClose={() => setClassDialog(false)} />
            )}
        </AppLayout>
    );
}
