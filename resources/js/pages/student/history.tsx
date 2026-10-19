import { usePage } from "@inertiajs/react";
import { Download } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import {
    Errors,
    PageHeader,
    PaginationControls,
    Stats,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { HistoryFilters } from "@/components/history-filters";
import { StudentRecords } from "@/components/student-records";
import { queryString } from "@/lib/utils";
import type {
    AttendanceRecord,
    Filters,
    Pagination,
    SharedProps,
    Summary,
} from "@/types";

export default function History({
    records,
    filters,
    summary,
}: {
    records: Pagination<AttendanceRecord>;
    filters: Filters;
    summary: Summary;
}) {
    const { errors } = usePage<SharedProps>().props;
    return (
        <AppLayout title="Riwayat Kehadiran">
            <PageHeader
                eyebrow="CATATAN PERJALANANMU"
                title="Riwayat kehadiran"
                description="Lihat hasil kehadiran yang sudah dikonfirmasi oleh guru."
            >
                <Button asChild>
                    <a href={`/siswa/laporan.pdf?${queryString(filters)}`}>
                        <Download size={17} />
                        Unduh PDF Pribadi
                    </a>
                </Button>
            </PageHeader>
            <Stats summary={summary} />
            <section className="panel section-space">
                <div className="section-heading">
                    <h2>Catatan kehadiran resmi</h2>
                </div>
                <HistoryFilters filters={filters} student />
                <Errors errors={errors} />
                <StudentRecords records={records.data} />
                <PaginationControls pagination={records} />
            </section>
        </AppLayout>
    );
}
