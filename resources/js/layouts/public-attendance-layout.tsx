import { Head } from "@inertiajs/react";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "@/components/shared";
import { PublicThemeToggle } from "@/components/public-attendance";

export default function PublicAttendanceLayout({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="public-attendance-page">
            <Head title={title}>
                <meta name="robots" content="noindex, nofollow, noarchive" />
                <meta name="referrer" content="no-referrer" />
            </Head>
            <header className="public-attendance-top">
                <Brand />
                <PublicThemeToggle />
            </header>
            <main id="main-content" className="public-attendance-main">
                {children}
            </main>
            <footer className="public-attendance-footer">
                <ShieldCheck size={15} />
                <span>
                    Portal Absensi SMAN 2 Rantau Selatan
                    <br />
                    Hadir. Belajar. Bertumbuh.
                </span>
            </footer>
        </div>
    );
}
