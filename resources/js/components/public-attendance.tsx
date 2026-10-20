import { Clock3, Copy, Check, Moon, Sun } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "./ui/button";

export function PublicFormStatus({ active }: { active: boolean }) {
    return (
        <span className={`badge ${active ? "badge-active" : "badge-review"}`}>
            <span className="badge-dot" />
            {active ? "Aktif" : "Kedaluwarsa"}
        </span>
    );
}
export function PublicCountdown({
    expiresAt,
    clock,
}: {
    expiresAt: string;
    clock: number;
}) {
    const seconds = Math.max(
        0,
        Math.ceil((Date.parse(expiresAt) - clock) / 1000),
    );
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = `${hours ? String(hours).padStart(2, "0") + ":" : ""}${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    return (
        <div
            className={`public-countdown ${seconds <= 60 ? "deadline-soon" : ""}`}
        >
            <Clock3 size={18} />
            <span>
                {seconds ? "Sisa waktu" : "Waktu berakhir"}
                <strong role="timer" aria-label="Sisa waktu formulir">
                    {remaining}
                </strong>
            </span>
        </div>
    );
}
export function CopyPublicLink({ url }: { url: string }) {
    const [message, setMessage] = useState("");
    const field = useRef<HTMLInputElement>(null);
    async function copy() {
        try {
            if (navigator.clipboard && window.isSecureContext)
                await navigator.clipboard.writeText(url);
            else {
                field.current?.focus();
                field.current?.select();
                if (!document.execCommand("copy"))
                    throw new Error("clipboard unavailable");
            }
            setMessage("Link berhasil disalin.");
        } catch {
            field.current?.focus();
            field.current?.select();
            setMessage(
                "Tekan dan tahan link atau gunakan Ctrl+C untuk menyalin.",
            );
        }
    }
    return (
        <div className="public-copy">
            <div className="public-copy-field">
                <input
                    ref={field}
                    aria-label="Link formulir publik"
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={copy}>
                    {message === "Link berhasil disalin." ? (
                        <Check size={16} />
                    ) : (
                        <Copy size={16} />
                    )}
                    Salin Link
                </Button>
            </div>
            <small role="status" className="muted">
                {message || "Bagikan link ini kepada siswa yang akan mengisi."}
            </small>
        </div>
    );
}
export function PublicThemeToggle() {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains("dark"),
    );
    function toggle() {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        setDark(next);
        try {
            localStorage.setItem("theme", next ? "dark" : "light");
        } catch {}
    }
    return (
        <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={dark ? "Gunakan mode terang" : "Gunakan mode gelap"}
            onClick={toggle}
        >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
    );
}
