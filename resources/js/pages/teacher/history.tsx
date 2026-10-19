import { usePage } from "@inertiajs/react";
import { Download } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import {
    Errors,
    PageHeader,
    PaginationControls,
    SessionList,
    Stats,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { HistoryFilters } from "@/components/history-filters";
import { queryString } from "@/lib/utils";
import type {
    AttendanceSession,
    Filters,
    Pagination,
    SchoolClass,
    SharedProps,
    Summary,
} from "@/types";

export default function History({
    sessions,
    classes,
    filters,
    summary,
}: {
    sessions: Pagination<AttendanceSession>;
    classes: SchoolClass[];
    filters: Filters;
    summary: Summary;
}) {
    const { errors } = usePage<SharedProps>().props;
    return (
        <AppLayout title="Riwayat & Rekap">
            <PageHeader
                eyebrow="CATATAN PEMBELAJARAN"
                title="Riwayat & rekap absensi"
                description="Telusuri sesi Anda dan unduh laporan hasil terkonfirmasi."
            >
                <Button asChild>
                    <a href={`/guru/laporan.pdf?${queryString(filters)}`}>
                        <Download size={17} />
                        Unduh PDF
                    </a>
                </Button>
            </PageHeader>
            <Stats summary={summary} />
            <section className="panel section-space">
                <div className="section-heading">
                    <div>
                        <h2>Semua sesi Anda</h2>
                        <p className="muted">
                            Ringkasan di atas dan PDF hanya menghitung catatan
                            yang sudah dikonfirmasi.
                        </p>
                    </div>
                </div>
                <HistoryFilters filters={filters} classes={classes} />
                <Errors errors={errors} />
                <SessionList sessions={sessions.data} />
                <PaginationControls pagination={sessions} />
            </section>
        </AppLayout>
    );
}
