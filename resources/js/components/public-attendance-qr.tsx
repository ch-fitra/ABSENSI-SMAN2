import { QRCodeSVG } from "qrcode.react";
import type { Ref } from "react";
import { wibDate, wibTime } from "@/lib/public-attendance";
import type { PublicAttendanceForm } from "@/types";

function titleLines(title: string): string[] {
    const lines: string[] = [];
    for (const word of title.trim().split(/\s+/u)) {
        const chunks = Array.from(word).join("").match(/.{1,32}/gu) || [word];
        for (const chunk of chunks) {
            const last = lines.length - 1;
            if (last >= 0 && Array.from(`${lines[last]} ${chunk}`).length <= 32) {
                lines[last] += ` ${chunk}`;
            } else {
                lines.push(chunk);
            }
        }
    }
    if (lines.length > 3) {
        return [...lines.slice(0, 2), `${Array.from(lines[2]).slice(0, 30).join("")}…`];
    }
    return lines;
}

export function PublicAttendanceQr({
    form,
    ref,
}: {
    form: PublicAttendanceForm;
    ref?: Ref<SVGSVGElement>;
}) {
    return (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 720 1000"
            width="720"
            height="1000"
            role="img"
            aria-label={`Kartu QR absensi ${form.title}`}
            fontFamily="Arial, Helvetica, sans-serif"
        >
            <title>{`Kartu QR absensi ${form.title}`}</title>
            <rect width="720" height="1000" rx="32" fill="#edf5f1" />
            <rect x="16" y="16" width="688" height="968" rx="24" fill="#fff" />
            <path d="M40 16h640a24 24 0 0 1 24 24v92H16V40a24 24 0 0 1 24-24Z" fill="#153e35" />
            <circle cx="664" cy="32" r="76" fill="#205448" />
            <circle cx="706" cy="110" r="42" fill="#2c6554" />
            <rect x="48" y="46" width="56" height="56" rx="16" fill="#e4f1a6" />
            <text x="76" y="83" textAnchor="middle" fontSize="27" fontWeight="700" fill="#153e35">02</text>
            <text x="122" y="69" fontSize="23" fontWeight="700" fill="#fff">SMAN 2</text>
            <text x="122" y="95" fontSize="15" letterSpacing="2.5" fill="#c8ddd4">RANTAU SELATAN</text>
            <text x="360" y="174" textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="3" fill="#598272">ABSENSI KEHADIRAN</text>
            {titleLines(form.title).map((line, index) => (
                <text key={index} x="360" y={216 + index * 34} textAnchor="middle" fontSize="28" fontWeight="700" fill="#153e35">{line}</text>
            ))}
            <rect x="96" y="302" width="528" height="528" rx="28" fill="#f0f6f2" />
            <rect x="108" y="314" width="504" height="504" rx="20" fill="#fff" />
            <QRCodeSVG
                value={form.public_url}
                x={112}
                y={318}
                size={496}
                level="M"
                marginSize={4}
                fgColor="#102e28"
                bgColor="#ffffff"
            />
            <text x="360" y="869" textAnchor="middle" fontSize="26" fontWeight="700" fill="#153e35">Pindai. Isi. Hadir.</text>
            <text x="360" y="897" textAnchor="middle" fontSize="16" fill="#60746d">Buka kamera HP dan arahkan ke QR di atas.</text>
            <line x1="64" x2="656" y1="922" y2="922" stroke="#e2ebe5" />
            <text x="360" y="948" textAnchor="middle" fontSize="15" fontWeight="700" fill="#38594c">
                Berlaku sampai {wibDate(form.expires_at)} · {wibTime(form.expires_at)} WIB
            </text>
            <text x="360" y="972" textAnchor="middle" fontSize="13" fill="#708279">Tanpa login · Pastikan absensi berhasil tersimpan</text>
        </svg>
    );
}
