import { Head, Link } from "@inertiajs/react";
import {
    ArrowRight,
    BookOpen,
    Clock3,
    GraduationCap,
    ShieldCheck,
    MousePointer2,
    FileCheck2,
} from "lucide-react";
import { motion } from "motion/react";
import { Brand } from "@/components/shared";
import { AttendanceArt } from "@/components/attendance-art";

const principles = [
    {
        icon: MousePointer2,
        title: "Mudah diakses",
        description: "Dari layar mana pun.",
    },
    {
        icon: Clock3,
        title: "Lebih sederhana",
        description: "Lebih banyak waktu belajar.",
    },
    {
        icon: FileCheck2,
        title: "Tetap teratur",
        description: "Setiap kehadiran tercatat.",
    },
];

export default function Welcome() {
    return (
        <div className="welcome-page">
            <Head title="Selamat Datang" />
            <header className="public-header">
                <Brand />
                <span className="public-tag">
                    <span className="public-tag-dot" />
                    PORTAL ABSENSI SEKOLAH
                </span>
            </header>
            <main className="welcome-main">
                <motion.div
                    className="welcome-copy"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="eyebrow">
                        <span className="small-line" />
                        HADIR UNTUK MASA DEPAN
                    </span>
                    <h1>
                        Awali pelajaran
                        <br />
                        dengan <em>kehadiran.</em>
                    </h1>
                    <p>
                        Selamat datang di portal absensi
                        <br className="desktop-only" /> SMAN 2 Rantau Selatan.
                        Catat kehadiran, lanjutkan pembelajaran.
                    </p>
                    <div className="role-options">
                        <Link href="/guru/masuk" className="role-card">
                            <span className="role-icon">
                                <BookOpen size={26} />
                            </span>
                            <div>
                                <strong>Saya seorang Guru</strong>
                                <small>
                                    Mulai sesi dan kelola kehadiran siswa
                                </small>
                            </div>
                            <ArrowRight size={22} />
                        </Link>
                        <Link href="/siswa/masuk" className="role-card">
                            <span className="role-icon role-icon-orange">
                                <GraduationCap size={28} />
                            </span>
                            <div>
                                <strong>Saya seorang Siswa</strong>
                                <small>
                                    Masuk dengan NISN, isi kehadiranmu
                                </small>
                            </div>
                            <ArrowRight size={22} />
                        </Link>
                    </div>
                    <span className="welcome-caption">
                        <ShieldCheck size={16} /> Sederhana, teratur, dan mudah
                        digunakan.
                    </span>
                </motion.div>
                <div className="welcome-visual" aria-hidden="true">
                    <div className="welcome-visual-label">
                        <span>KEHADIRAN YANG BERARTI</span>
                        <SparkleMark />
                    </div>
                    <AttendanceArt />
                </div>
            </main>
            <div className="welcome-principles">
                {principles.map(({ icon: Icon, title, description }) => (
                    <div key={title}>
                        <span>
                            <Icon size={20} strokeWidth={1.6} />
                        </span>
                        <div>
                            <strong>{title}</strong>
                            <p>{description}</p>
                        </div>
                    </div>
                ))}
            </div>
            <footer className="public-footer">
                <span>© {new Date().getFullYear()} SMAN 2 Rantau Selatan</span>
                <span>Portal kehadiran siswa</span>
            </footer>
        </div>
    );
}

function SparkleMark() {
    return (
        <span className="welcome-star" aria-hidden="true">
            ✦
        </span>
    );
}
