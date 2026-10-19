import {
    ArrowUpRight,
    BookOpen,
    Check,
    GraduationCap,
    Sparkles,
} from "lucide-react";

/** Decorative illustration; contains no live attendance results. */
export function AttendanceArt({ compact = false }: { compact?: boolean }) {
    return (
        <div
            className={`attendance-art ${compact ? "art-compact" : ""}`}
            aria-hidden="true"
        >
            <div className="art-grid" />
            <div className="art-orbit art-orbit-one" />
            <div className="art-orbit art-orbit-two" />
            <span className="art-spark art-spark-one">
                <Sparkles size={30} strokeWidth={1.2} />
            </span>
            <span className="art-spark art-spark-two">✦</span>
            <div className="art-floating art-learning">
                <span>
                    <BookOpen size={21} />
                </span>
                <div>
                    <small>SELALU ADA RUANG</small>
                    <strong>untuk bertumbuh.</strong>
                </div>
                <ArrowUpRight size={17} />
            </div>
            <div className="art-paper art-paper-back" />
            <div className="art-paper art-paper-middle" />
            <div className="art-paper art-paper-front">
                <div className="art-paper-top">
                    <span className="art-school-icon">
                        <GraduationCap size={27} strokeWidth={1.5} />
                    </span>
                    <span>
                        SMAN 2<br />
                        <b>RANTAU SELATAN</b>
                    </span>
                    <span className="art-paper-number">02</span>
                </div>
                <div className="art-paper-heading">
                    Hari baru.
                    <br />
                    <em>Cerita baru.</em>
                </div>
                <span className="art-paper-subtitle">
                    Mulai langkah baikmu hari ini.
                </span>
                <div className="art-checklist">
                    {[
                        "Datang dengan semangat",
                        "Belajar hal baru",
                        "Tumbuh bersama",
                    ].map((text, i) => (
                        <div key={text}>
                            <span className={`art-check art-check-${i}`}>
                                <Check size={12} strokeWidth={3} />
                            </span>
                            <span>{text}</span>
                            <span className="art-check-line" />
                        </div>
                    ))}
                </div>
                <div className="art-paper-bottom">
                    <span>HADIR. BELAJAR. BERTUMBUH.</span>
                    <ArrowUpRight size={18} />
                </div>
            </div>
            <div className="art-floating art-present">
                <span>
                    <Check size={23} strokeWidth={3} />
                </span>
                <div>
                    <strong>Hadir itu berarti.</strong>
                    <small>Untuk dirimu, untuk masa depan.</small>
                </div>
            </div>
            <div className="art-caption">
                <span />
                Setiap langkah kecil, awal hal besar.
            </div>
        </div>
    );
}
