import { router } from "@inertiajs/react";
import { WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

export function NetworkFeedback() {
    const [message, setMessage] = useState("");
    useEffect(() => {
        const offline = () =>
            setMessage(
                "Koneksi internet terputus. Data formulir tetap tersedia. Sambungkan kembali, lalu coba kirim lagi.",
            );
        const online = () => setMessage("");
        window.addEventListener("offline", offline);
        window.addEventListener("online", online);
        const unsubscribe = router.on("exception", (event) => {
            event.preventDefault();
            setMessage(
                "Permintaan belum berhasil. Periksa koneksi Anda, lalu coba kembali. Data formulir tetap tersedia.",
            );
        });
        if (!navigator.onLine) offline();
        return () => {
            window.removeEventListener("offline", offline);
            window.removeEventListener("online", online);
            unsubscribe();
        };
    }, []);
    return message ? (
        <div className="network-feedback" role="alert">
            <WifiOff size={20} />
            <p>{message}</p>
            <button
                type="button"
                onClick={() => setMessage("")}
                aria-label="Tutup pesan koneksi"
            >
                <X size={17} />
            </button>
        </div>
    ) : null;
}
