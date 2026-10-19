import { Head, Link } from "@inertiajs/react";
import {
    ArrowRight,
    BookOpen,
    Check,
    Clock3,
    GraduationCap,
    ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { Brand } from "@/components/shared";

export default function Welcome() {
    return (
        <div className="welcome-page">
            <Head title="Selamat Datang" />
            <header className="public-header">
                <Brand />
                <span className="public-tag">PORTAL ABSENSI SEKOLAH</span>
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
                    <div className="visual-orbit orbit-one" />
                    <div className="visual-orbit orbit-two" />
                    <div className="visual-top">
                        <span className="visual-pill">
                            LANGKAH KECIL, DAMPAK BESAR
                        </span>
                        <span>02 /</span>
                    </div>
                    <div className="visual-message">
                        Setiap hari.
                        <br />
                        Setiap langkah.
                        <br />
                        <span>Setiap kehadiran.</span>
                    </div>
                    <div className="visual-attendance">
                        <div className="flex-between">
                            <span className="visual-icon">
                                <Check size={22} />
                            </span>
                            <span className="visual-date">
                                SEMANGAT BELAJAR
                            </span>
                        </div>
                        <h3>Siap hadir hari ini?</h3>
                        <div className="visual-line" />
                        <div className="visual-avatars">
                            {["A", "R", "S", "N"].map((x) => (
                                <span key={x}>{x}</span>
                            ))}
                            <small>Belajar dan bertumbuh bersama</small>
                        </div>
                    </div>
                    <div className="visual-bottom">
                        <Clock3 size={17} />
                        <span>Hadir tepat waktu. Mulai hal baik.</span>
                    </div>
                </div>
            </main>
            <footer className="public-footer">
                <span>© {new Date().getFullYear()} SMAN 2 Rantau Selatan</span>
                <span>Portal kehadiran siswa</span>
            </footer>
        </div>
    );
}
