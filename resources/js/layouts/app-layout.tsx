import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    BookOpen,
    ChartNoAxesCombined,
    ChevronRight,
    GraduationCap,
    Home,
    LogOut,
    Link2,
    Menu,
    Moon,
    Settings,
    Sun,
    Users,
    X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
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
    const reduceMotion = useReducedMotion();
    const sidebarRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open) return;
        const trigger = document.activeElement as HTMLElement | null;
        const focusFrame = window.requestAnimationFrame(() => {
            sidebarRef.current?.querySelector<HTMLElement>("a")?.focus();
        });
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Tab") {
                const controls =
                    sidebarRef.current?.querySelectorAll<HTMLElement>(
                        "a, button:not(:disabled)",
                    );
                if (!controls?.length) return;
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener("keydown", closeOnEscape);
            trigger?.focus();
        };
    }, [open]);
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
                  label: "Absensi via Link",
                  href: `${root}/absensi-link`,
                  icon: Link2,
              },
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
    const isActive = (href: string) =>
        url === href ||
        (href.endsWith("/absensi-link") && url.startsWith(href + "/")) ||
        (href.endsWith("/absensi/buat") && url.includes("/absensi/"));
    return (
        <div className="app-shell">
            <Head title={title} />
            <a className="skip-link" href="#main-content">
                Langsung ke konten
            </a>
            {open && (
                <button
                    className="sidebar-scrim"
                    onClick={() => setOpen(false)}
                    aria-label="Tutup navigasi"
                />
            )}
            <aside
                ref={sidebarRef}
                id="app-sidebar"
                className={`sidebar ${open ? "sidebar-open" : ""}`}
            >
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
                            aria-current={isActive(href) ? "page" : undefined}
                            className={`nav-item ${isActive(href) ? "nav-active" : ""}`}
                        >
                            <span className="nav-icon">
                                <Icon size={19} />
                            </span>
                            <span>{label}</span>
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
                            aria-expanded={open}
                            aria-controls="app-sidebar"
                        >
                            <Menu size={22} />
                        </Button>
                        <span className="topbar-title">
                            <GraduationCap size={19} strokeWidth={1.6} />
                            <span className="topbar-breadcrumb">
                                Portal Absensi
                            </span>
                            <ChevronRight size={13} />
                            <strong>{title}</strong>
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
                        <motion.div
                            key={flash.success}
                            initial={
                                reduceMotion ? false : { opacity: 0, y: -7 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="alert alert-success"
                            role="status"
                        >
                            {flash.success}
                        </motion.div>
                    )}
                    {navigating && (
                        <div
                            className="navigation-progress"
                            aria-label="Memuat halaman"
                        />
                    )}
                    <motion.div
                        className="page-content"
                        key={url}
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.32,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        {children}
                    </motion.div>
                </main>
                <footer className="app-footer">
                    <span>
                        © {new Date().getFullYear()} SMAN 2 Rantau Selatan
                    </span>
                    <span>Hadir. Belajar. Bertumbuh.</span>
                </footer>
            </div>
            <nav className="mobile-dock" aria-label="Navigasi cepat">
                {items.slice(0, 4).map(({ label, href, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        aria-current={isActive(href) ? "page" : undefined}
                        className={isActive(href) ? "dock-active" : ""}
                    >
                        <span>
                            <Icon size={20} />
                        </span>
                        <small>
                            {label === "Riwayat & Rekap" ||
                            label === "Riwayat Kehadiran"
                                ? "Riwayat"
                                : label === "Absensi via Link"
                                  ? "Via Link"
                                  : label}
                        </small>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
