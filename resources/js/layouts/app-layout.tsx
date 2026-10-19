import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    BookOpen,
    ChartNoAxesCombined,
    ChevronRight,
    GraduationCap,
    Home,
    LogOut,
    Menu,
    Moon,
    Settings,
    Sun,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Brand } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { SharedProps } from "@/types";

export default function AppLayout({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    const { auth, flash } = usePage<SharedProps>().props;
    const url = usePage().url.split("?")[0];
    const [open, setOpen] = useState(false);
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains("dark"),
    );
    const [navigating, setNavigating] = useState(false);
    useEffect(() => {
        const start = router.on("start", (event) => {
            if (!event.detail.visit.only.length) setNavigating(true);
        });
        const finish = router.on("finish", () => setNavigating(false));
        return () => {
            start();
            finish();
        };
    }, []);
    const teacher = auth.role === "teacher";
    const root = teacher ? "/guru" : "/siswa";
    const items = teacher
        ? [
              { label: "Dashboard", href: root, icon: Home },
              {
                  label: "Absensi",
                  href: `${root}/absensi/buat`,
                  icon: BookOpen,
              },
              {
                  label: "Riwayat & Rekap",
                  href: `${root}/riwayat`,
                  icon: ChartNoAxesCombined,
              },
              { label: "Data Siswa", href: `${root}/siswa`, icon: Users },
              {
                  label: "Pengaturan",
                  href: `${root}/pengaturan`,
                  icon: Settings,
              },
          ]
        : [
              { label: "Dashboard", href: root, icon: Home },
              {
                  label: "Riwayat Kehadiran",
                  href: `${root}/riwayat`,
                  icon: ChartNoAxesCombined,
              },
          ];
    function toggleTheme() {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        try {
            localStorage.setItem("theme", next ? "dark" : "light");
        } catch {}
    }
    return (
        <div className="app-shell">
            <Head title={title} />
            {open && (
                <button
                    className="sidebar-scrim"
                    onClick={() => setOpen(false)}
                    aria-label="Tutup navigasi"
                />
            )}
            <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
                <div className="sidebar-brand">
                    <Brand />
                    <Button
                        className="mobile-only"
                        size="icon"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        aria-label="Tutup menu"
                    >
                        <X size={20} />
                    </Button>
                </div>
                <span className="sidebar-label">
                    PORTAL {teacher ? "GURU" : "SISWA"}
                </span>
                <nav aria-label="Navigasi utama">
                    {items.map(({ label, href, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className={`nav-item ${url === href || (href.endsWith("/absensi/buat") && url.includes("/absensi/")) ? "nav-active" : ""}`}
                        >
                            <Icon size={19} />
                            {label}
                            <ChevronRight size={15} className="nav-arrow" />
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-note">
                    <GraduationCap size={25} />
                    <strong>Setiap kehadiran berarti.</strong>
                    <p>
                        Langkah kecil hari ini,
                        <br />
                        masa depan lebih baik.
                    </p>
                </div>
                <div className="sidebar-user">
                    <span className="avatar">
                        {auth.user?.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                        <strong>{auth.user?.name}</strong>
                        <small>
                            {teacher
                                ? "Akun Guru"
                                : `Kelas ${auth.user?.class_name}`}
                        </small>
                    </div>
                    <button
                        onClick={() => router.post("/keluar")}
                        aria-label="Keluar dari akun"
                        title="Keluar"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>
            <div className="main-shell">
                <header className="topbar">
                    <div className="topbar-left">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="mobile-only"
                            onClick={() => setOpen(true)}
                            aria-label="Buka navigasi"
                        >
                            <Menu size={22} />
                        </Button>
                        <span className="topbar-title">
                            Portal Absensi <span>/ {title}</span>
                        </span>
                    </div>
                    <div className="topbar-right">
                        <span className="school-year">
                            SMAN 2 Rantau Selatan
                        </span>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={toggleTheme}
                            aria-label={
                                dark
                                    ? "Gunakan mode terang"
                                    : "Gunakan mode gelap"
                            }
                        >
                            {dark ? <Sun size={19} /> : <Moon size={19} />}
                        </Button>
                        <span className="avatar avatar-small">
                            {auth.user?.name.charAt(0)}
                        </span>
                    </div>
                </header>
                <main className="main-content" id="main-content">
                    {flash.success && (
                        <div
                            key={flash.success}
                            className="alert alert-success"
                            role="status"
                        >
                            {flash.success}
                        </div>
                    )}
                    {navigating && (
                        <div
                            className="navigation-progress"
                            aria-label="Memuat halaman"
                        />
                    )}
                    {children}
                </main>
                <footer className="app-footer">
                    <span>
                        © {new Date().getFullYear()} SMAN 2 Rantau Selatan
                    </span>
                    <span>Hadir. Belajar. Bertumbuh.</span>
                </footer>
            </div>
        </div>
    );
}
