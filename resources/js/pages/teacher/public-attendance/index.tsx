import { Link } from "@inertiajs/react";
import {
    ArrowRight,
    Clock3,
    FileText,
    Link2,
    MessageSquare,
    Plus,
    QrCode,
} from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import {
    EmptyState,
    PageHeader,
    PaginationControls,
} from "@/components/shared";
import {
    CopyPublicLink,
    PublicFormStatus,
} from "@/components/public-attendance";
import { Button } from "@/components/ui/button";
import { useServerClock, wibDate, wibTime } from "@/lib/public-attendance";
import type { Pagination, PublicAttendanceForm } from "@/types";

export default function PublicForms({
    forms,
    statistics,
    createUrl,
}: {
    forms: Pagination<PublicAttendanceForm>;
    statistics: {
        total: number;
        active: number;
        expired: number;
        responses: number;
    };
    createUrl: string;
}) {
    const clock = useServerClock();
    const metrics = [
        { label: "Total Form", value: statistics.total, icon: FileText },
        { label: "Form Aktif", value: statistics.active, icon: Link2 },
        { label: "Form Berakhir", value: statistics.expired, icon: Clock3 },
        {
            label: "Total Respons",
            value: statistics.responses,
            icon: MessageSquare,
        },
    ];
    return (
        <AppLayout title="Absensi via Link">
            <PageHeader
                eyebrow="HADIR DARI MANA SAJA"
                title="Absensi via Link"
                description="Buat formulir absensi dan bagikan melalui link atau QR Code tanpa perlu login siswa."
            >
                <Button asChild>
                    <Link href={createUrl}>
                        <Plus size={17} />
                        Buat Link Absensi
                    </Link>
                </Button>
            </PageHeader>
            <div className="public-metrics">
                {metrics.map(({ label, value, icon: Icon }) => (
                    <div className="panel public-metric" key={label}>
                        <span className="public-metric-icon">
                            <Icon size={20} />
                        </span>
                        <div>
                            <small>{label}</small>
                            <strong>{value.toLocaleString("id-ID")}</strong>
                        </div>
                    </div>
                ))}
            </div>
            <section className="section-space">
                <div className="section-heading">
                    <div>
                        <h2>Formulir Anda</h2>
                        <p className="muted">
                            Link, respons, dan rekap tersimpan di satu tempat.
                        </p>
                    </div>
                    <QrCode size={24} className="muted" />
                </div>
                {forms.data.length ? (
                    <div className="public-form-grid">
                        {forms.data.map((form) => (
                            <article
                                className="panel public-form-card"
                                key={form.id}
                            >
                                <div className="flex-between">
                                    <span className="public-card-icon">
                                        <Link2 size={20} />
                                    </span>
                                    <PublicFormStatus
                                        active={
                                            clock < Date.parse(form.expires_at)
                                        }
                                    />
                                </div>
                                <h3>{form.title}</h3>
                                <p className="muted">
                                    Dibuat {wibDate(form.starts_at)} ·{" "}
                                    {wibTime(form.starts_at)} WIB
                                </p>
                                <div className="public-card-facts">
                                    <span>
                                        <Clock3 size={14} />
                                        {form.duration_minutes} menit
                                    </span>
                                    <span>
                                        <MessageSquare size={14} />
                                        {form.submissions_count} respons
                                    </span>
                                </div>
                                {clock < Date.parse(form.expires_at) && (
                                    <CopyPublicLink url={form.public_url} />
                                )}
                                <Button asChild variant="outline">
                                    <Link href={clock < Date.parse(form.expires_at) ? form.detail_url : form.responses_url}>
                                        {clock < Date.parse(form.expires_at) ? "Lihat Detail" : "Lihat Respons"}
                                        <ArrowRight size={16} />
                                    </Link>
                                </Button>
                            </article>
                        ))}
                    </div>
                ) : (
                    <section className="panel">
                        <EmptyState
                            title="Belum ada link absensi."
                            description="Mulai dengan membuat formulir absensi pertama Anda."
                        >
                            <Button asChild>
                                <Link href={createUrl}>
                                    <Plus size={16} />
                                    Buat Link Absensi
                                </Link>
                            </Button>
                        </EmptyState>
                    </section>
                )}
                <PaginationControls pagination={forms} />
            </section>
        </AppLayout>
    );
}
