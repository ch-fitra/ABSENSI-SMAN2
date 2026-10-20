import { Link, usePage, usePoll } from "@inertiajs/react";
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Link2,
    Plus,
    Sparkles,
} from "lucide-react";
import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import {
    EmptyState,
    PageHeader,
    SessionCard,
    SessionList,
    Stats,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
    const [attendanceOptionsOpen, setAttendanceOptionsOpen] = useState(false);
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
                <Dialog
                    open={attendanceOptionsOpen}
                    onOpenChange={setAttendanceOptionsOpen}
                    title="Mulai absensi dengan cara apa?"
                    description="Pilih cara yang sesuai untuk kelas Anda."
                    trigger={
                        <Button variant="secondary">
                            <Plus size={19} />
                            Mulai Absensi
                        </Button>
                    }
                >
                    <div className="attendance-methods">
                        <Link
                            href="/guru/absensi-link/buat"
                            className="attendance-method"
                            onClick={() => setAttendanceOptionsOpen(false)}
                        >
                            <span className="attendance-method-icon" aria-hidden="true">
                                <Link2 size={23} />
                            </span>
                            <span className="attendance-method-copy">
                                <strong>Absensi via Link</strong>
                                <span>Bagikan link atau QR code agar siswa dapat mengisi absensi tanpa login.</span>
                            </span>
                            <ArrowRight size={19} aria-hidden="true" />
                        </Link>
                        <Link
                            href="/guru/absensi/buat"
                            className="attendance-method"
                            onClick={() => setAttendanceOptionsOpen(false)}
                        >
                            <span className="attendance-method-icon attendance-method-icon-session" aria-hidden="true">
                                <BookOpen size={23} />
                            </span>
                            <span className="attendance-method-copy">
                                <strong>Buka Sesi Absen</strong>
                                <span>Pilih kelas dari daftar siswa. Siswa masuk dengan NISN untuk mengisi kehadiran.</span>
                            </span>
                            <ArrowRight size={19} aria-hidden="true" />
                        </Link>
                    </div>
                </Dialog>
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
