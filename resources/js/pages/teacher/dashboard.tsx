import { Link, usePage, usePoll } from "@inertiajs/react";
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Plus,
    Sparkles,
} from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import {
    EmptyState,
    PageHeader,
    SessionCard,
    SessionList,
    Stats,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { AttendanceSession, SharedProps, Summary } from "@/types";

export default function Dashboard({
    sessions,
    recent,
    summary,
    sessionCount,
}: {
    sessions: AttendanceSession[];
    recent: AttendanceSession[];
    summary: Summary;
    sessionCount: number;
}) {
    const { auth, serverNow } = usePage<SharedProps>().props;
    usePoll(15000, {
        only: ["sessions", "recent", "summary", "sessionCount", "serverNow"],
    });
    return (
        <AppLayout title="Dashboard">
            <PageHeader
                eyebrow="SELAMAT DATANG DI PORTAL GURU"
                title={`Halo, ${auth.user?.name}.`}
                description="Mari mulai hari ini dengan kehadiran yang berarti."
            >
                <span className="date-label">
                    <CalendarDays size={15} />
                    {new Intl.DateTimeFormat("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "Asia/Jakarta",
                    }).format(new Date(serverNow))}
                </span>
            </PageHeader>
            <section className="dashboard-hero">
                <div className="hero-ornament" aria-hidden="true">
                    <div />
                    <span>
                        <BookOpen size={54} strokeWidth={1.2} />
                    </span>
                    <Sparkles size={24} strokeWidth={1.2} />
                </div>
                <div>
                    <span className="eyebrow">SIAP MEMULAI PELAJARAN?</span>
                    <h2>Absensi mudah. Fokus mengajar.</h2>
                    <p>
                        Pilih kelas dan mata pelajaran, lalu buka sesi. Siswa
                        dapat langsung mengisi kehadiran mereka.
                    </p>
                </div>
                <Button asChild variant="secondary">
                    <Link href="/guru/absensi/buat">
                        <Plus size={19} />
                        Mulai Absensi
                    </Link>
                </Button>
            </section>
            <Stats summary={summary} />
            <section className="section-space">
                <div className="section-heading">
                    <div>
                        <h2>Sesi yang perlu perhatian</h2>
                        <p className="muted">
                            Pantau sesi aktif dan selesaikan konfirmasi
                            kehadiran.
                        </p>
                    </div>
                    <span className="count-label">{sessions.length} sesi</span>
                </div>
                {sessions.length ? (
                    <div className="session-grid">
                        {sessions.map((session) => (
                            <SessionCard key={session.id} session={session} />
                        ))}
                    </div>
                ) : (
                    <div className="panel">
                        <EmptyState
                            title="Semua sudah tertangani"
                            description="Belum ada sesi aktif atau sesi yang menunggu konfirmasi. Anda dapat memulai sesi baru kapan saja."
                        />
                    </div>
                )}
            </section>
            <section className="panel section-space">
                <div className="section-heading">
                    <div>
                        <h2>Absensi terbaru</h2>
                        <p className="muted">
                            {sessionCount} sesi dibuat · Hasil yang sudah Anda
                            konfirmasi
                        </p>
                    </div>
                    <Link className="text-link" href="/guru/riwayat">
                        Lihat riwayat
                        <ArrowRight size={15} />
                    </Link>
                </div>
                <SessionList sessions={recent} />
            </section>
        </AppLayout>
    );
}
