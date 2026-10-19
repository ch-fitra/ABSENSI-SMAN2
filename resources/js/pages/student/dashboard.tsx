import { Link, router, usePage, usePoll } from "@inertiajs/react";
import { ArrowRight, GraduationCap, RefreshCw } from "lucide-react";
import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import {
    EmptyState,
    PageHeader,
    SessionCard,
    Stats,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { StudentRecords } from "@/components/student-records";
import type { AttendanceRecord, SharedProps, Summary } from "@/types";

export default function Dashboard({
    available,
    recent,
    summary,
}: {
    available: AttendanceRecord[];
    recent: AttendanceRecord[];
    summary: Summary;
}) {
    const { auth } = usePage<SharedProps>().props;
    const [refreshing, setRefreshing] = useState(false);
    usePoll(10000, { only: ["available", "recent", "summary", "serverNow"] });
    return (
        <AppLayout title="Dashboard">
            <PageHeader
                eyebrow="SELAMAT DATANG DI PORTAL SISWA"
                title={`Halo, ${auth.user?.name}.`}
                description={`Kelas ${auth.user?.class_name} · NISN ${auth.user?.nisn}`}
            >
                <Button
                    variant="outline"
                    disabled={refreshing}
                    onClick={() => {
                        setRefreshing(true);
                        router.reload({ onFinish: () => setRefreshing(false) });
                    }}
                >
                    <RefreshCw size={16} className={refreshing ? "spin" : ""} />
                    Perbarui Sesi
                </Button>
            </PageHeader>
            <div className="student-banner">
                <GraduationCap size={36} />
                <div>
                    <h2>Hadir hari ini, selangkah lebih maju.</h2>
                    <p>
                        Pilih sesi yang sedang berlangsung, lalu kirim
                        kehadiranmu sebelum waktu habis.
                    </p>
                </div>
            </div>
            <section>
                <div className="section-heading">
                    <div>
                        <h2>Sesi absensi untukmu</h2>
                        <p className="muted">
                            Diperbarui otomatis setiap 10 detik.
                        </p>
                    </div>
                    <span className="count-label">
                        {
                            available.filter(
                                (r) => r.attendance_session.status === "active",
                            ).length
                        }{" "}
                        aktif
                    </span>
                </div>
                {available.length ? (
                    <div className="session-grid">
                        {available.map((record) => (
                            <SessionCard
                                key={record.id}
                                session={record.attendance_session}
                                student
                                submitted={!!record.submitted_at}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="panel">
                        <EmptyState
                            title="Belum ada sesi absensi yang aktif."
                            description="Sesi akan muncul di sini ketika guru membuka absensi untukmu."
                        />
                    </div>
                )}
            </section>
            <section className="section-space">
                <div className="section-heading">
                    <div>
                        <h2>Ringkasan kehadiranmu</h2>
                        <p className="muted">
                            Hanya hasil yang telah dikonfirmasi guru.
                        </p>
                    </div>
                </div>
                <Stats summary={summary} />
            </section>
            <section className="panel section-space">
                <div className="section-heading">
                    <h2>Kehadiran terbaru</h2>
                    <Link href="/siswa/riwayat" className="text-link">
                        Lihat riwayat
                        <ArrowRight size={15} />
                    </Link>
                </div>
                <StudentRecords records={recent} />
            </section>
        </AppLayout>
    );
}
