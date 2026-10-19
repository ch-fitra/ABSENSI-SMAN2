import { router, useForm } from "@inertiajs/react";
import { Filter, RotateCcw } from "lucide-react";
import type { FormEvent } from "react";
import { Field } from "./shared";
import { Button } from "./ui/button";
import type { Filters, SchoolClass } from "@/types";

export function HistoryFilters({
    filters,
    classes,
    student = false,
}: {
    filters: Filters;
    classes?: SchoolClass[];
    student?: boolean;
}) {
    const form = useForm({
        from: filters.from ?? "",
        to: filters.to ?? "",
        class_id: filters.class_id ?? "",
        subject: filters.subject ?? "",
        status: filters.status ?? "",
    });
    const url = student ? "/siswa/riwayat" : "/guru/riwayat";
    function submit(e: FormEvent) {
        e.preventDefault();
        form.get(url, { preserveState: true, preserveScroll: true });
    }
    return (
        <form
            onSubmit={submit}
            className={`filters ${student ? "filters-student" : ""}`}
        >
            <Field label="Tanggal awal">
                <input
                    aria-label="Tanggal awal"
                    type="date"
                    value={form.data.from}
                    onChange={(e) => form.setData("from", e.target.value)}
                />
            </Field>
            <Field label="Tanggal akhir">
                <input
                    aria-label="Tanggal akhir"
                    type="date"
                    min={form.data.from}
                    value={form.data.to}
                    onChange={(e) => form.setData("to", e.target.value)}
                />
            </Field>
            {!student && (
                <>
                    <Field label="Kelas">
                        <select
                            value={form.data.class_id}
                            onChange={(e) =>
                                form.setData("class_id", e.target.value)
                            }
                        >
                            <option value="">Semua kelas</option>
                            {classes?.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Mata pelajaran">
                        <input
                            placeholder="Semua pelajaran"
                            value={form.data.subject}
                            maxLength={120}
                            onChange={(e) =>
                                form.setData("subject", e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Status sesi">
                        <select
                            value={form.data.status}
                            onChange={(e) =>
                                form.setData("status", e.target.value)
                            }
                        >
                            <option value="">Semua status</option>
                            <option value="active">Sedang berlangsung</option>
                            <option value="review">Menunggu konfirmasi</option>
                            <option value="confirmed">Terkonfirmasi</option>
                        </select>
                    </Field>
                </>
            )}
            <div className="filter-actions">
                <Button disabled={form.processing} size="sm">
                    <Filter size={15} />
                    Terapkan
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Reset filter"
                    onClick={() => router.get(url)}
                >
                    <RotateCcw size={15} />
                </Button>
            </div>
        </form>
    );
}
