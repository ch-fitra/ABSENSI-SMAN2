import { Link, router, usePage } from "@inertiajs/react";
import {
    Check,
    CheckCircle2,
    Clock3,
    FileCheck2,
    LoaderCircle,
    ArrowLeft,
    ArrowRight,
    CircleAlert,
    Inbox,
} from "lucide-react";
import {
    Children,
    cloneElement,
    isValidElement,
    useEffect,
    useId,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/button";
import { formatDate, sessionLabels } from "@/lib/utils";
import type {
    AttendanceSession,
    AttendanceStatus,
    Pagination,
    SharedProps,
    Summary,
} from "@/types";

export function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <Link
            href="/"
            className="brand"
            aria-label="Beranda SMAN 2 Rantau Selatan"
        >
            <span className="brand-mark">
                02
                <span />
            </span>
            {!compact && (
                <span>
                    SMAN 2<span className="brand-sub">RANTAU SELATAN</span>
                </span>
            )}
        </Link>
    );
}
export function Field({
    label,
    error,
    children,
    hint,
}: {
    label: string;
    error?: string;
    children: ReactNode;
    hint?: string;
}) {
    const id = useId();
    function associate(nodes: ReactNode): ReactNode {
        return Children.map(nodes, (child) => {
            if (!isValidElement(child)) return child;
            const element = child as ReactElement<Record<string, unknown>>;
            if (
                typeof element.type === "string" &&
                ["input", "select", "textarea"].includes(element.type)
            ) {
                return cloneElement(element, {
                    id,
                    "aria-invalid": !!error,
                    "aria-describedby":
                        [hint && `${id}-hint`, error && `${id}-error`]
                            .filter(Boolean)
                            .join(" ") || undefined,
                });
            }
            return element.props.children
                ? cloneElement(
                      element,
                      {},
                      associate(element.props.children as ReactNode),
                  )
                : element;
        });
    }
    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            {associate(children)}
            {hint && (
                <small id={`${id}-hint`} className="muted">
                    {hint}
                </small>
            )}
            {error && (
                <small id={`${id}-error`} className="field-error" role="alert">
                    {error}
                </small>
            )}
        </div>
    );
}
export function Errors({ errors }: { errors: Record<string, string> }) {
    return Object.keys(errors).length ? (
        <div className="alert alert-error" role="alert">
            <CircleAlert size={18} />
            <div>
                {[...new Set(Object.values(errors))].map((error, i) => (
                    <p key={i}>{error}</p>
                ))}
            </div>
        </div>
    ) : null;
}
export function Loading({ text = "Menyimpan…" }: { text?: string }) {
    return (
        <>
            <LoaderCircle size={17} className="spin" />
            {text}
        </>
    );
}
export function EmptyState({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return (
        <div className="empty-state">
            <span className="empty-icon">
                <Inbox size={28} />
            </span>
            <h3>{title}</h3>
            {description && <p className="muted">{description}</p>}
            {children}
        </div>
    );
}
export function StatusBadge({
    status,
}: {
    status: AttendanceStatus | AttendanceSession["status"] | null;
}) {
    return (
        <span className={`badge badge-${status ?? "pending"}`}>
            <span className="badge-dot" />
            {status
                ? status in sessionLabels
                    ? sessionLabels[status as AttendanceSession["status"]]
                    : status.charAt(0).toUpperCase() + status.slice(1)
                : "Belum mengisi"}
        </span>
    );
}
export function Stats({
    summary,
    confirmed = true,
}: {
    summary: Summary;
    confirmed?: boolean;
}) {
    const reduceMotion = useReducedMotion();
    return (
        <div className="stats-grid">
            {(
                [
                    ["total", "Total catatan", FileCheck2],
                    ["hadir", "Hadir", CheckCircle2],
                    ["izin", "Izin", FileCheck2],
                    ["sakit", "Sakit", CircleAlert],
                    ["alpa", "Alpa", Clock3],
                ] as const
            ).map(([key, label, Icon], i) => (
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.035 }}
                    className={`stat-card stat-${key}`}
                    key={key}
                >
                    <span className="stat-icon">
                        <Icon size={19} />
                    </span>
                    <span className="stat-label">{label}</span>
                    <strong>{summary[key].toLocaleString("id-ID")}</strong>
                    <small>
                        {key === "total"
                            ? confirmed
                                ? "Hasil terkonfirmasi"
                                : "Respons tersimpan"
                            : "Catatan kehadiran"}
                    </small>
                    <span className="stat-meter" aria-hidden="true">
                        <span
                            style={{
                                width: `${summary.total ? (key === "total" ? 100 : Math.max(0, Math.min(100, (summary[key] / summary.total) * 100))) : 0}%`,
                            }}
                        />
                    </span>
                </motion.div>
            ))}
        </div>
    );
}
export function PageHeader({
    eyebrow,
    title,
    description,
    children,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return (
        <header className="page-header">
            <div>
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                <h1>{title}</h1>
                {description && <p className="muted">{description}</p>}
            </div>
            {children && <div className="header-actions">{children}</div>}
        </header>
    );
}
export function SessionCard({
    session,
    student = false,
    submitted = false,
}: {
    session: AttendanceSession;
    student?: boolean;
    submitted?: boolean;
}) {
    return (
        <Link
            href={`/${student ? "siswa" : "guru"}/absensi/${session.id}`}
            className={`session-card session-card-${session.status}`}
        >
            <div className="flex-between">
                <span className="class-chip">
                    {session.class_name_snapshot}
                </span>
                <StatusBadge status={session.status} />
            </div>
            <h3>{session.subject_name}</h3>
            <p className="muted">
                {student
                    ? session.teacher?.name
                    : `Sesi #${session.id} · ${session.records_count} siswa`}
            </p>
            <div className="session-card-bottom">
                <span>
                    <Clock3 size={15} />
                    {formatDate(session.starts_at)}
                </span>
                <ArrowRight size={18} />
            </div>
            {submitted && (
                <span className="submitted-label">
                    <Check size={15} /> Absensi sudah dikirim
                </span>
            )}
        </Link>
    );
}
export function SessionList({ sessions }: { sessions: AttendanceSession[] }) {
    return sessions.length ? (
        <div className="session-table">
            <div className="table-heading">
                <span>Mata pelajaran / sesi</span>
                <span>Kelas</span>
                <span>Waktu mulai</span>
                <span>Status</span>
                <span />
            </div>
            {sessions.map((session) => (
                <Link
                    className="session-row"
                    href={`/guru/absensi/${session.id}`}
                    key={session.id}
                >
                    <span>
                        <strong>{session.subject_name}</strong>
                        <small>
                            Sesi #{session.id} · {session.records_count} siswa
                        </small>
                    </span>
                    <span className="class-chip">
                        {session.class_name_snapshot}
                    </span>
                    <span className="muted">
                        {formatDate(session.starts_at)}
                    </span>
                    <StatusBadge status={session.status} />
                    <ArrowRight size={17} />
                </Link>
            ))}
        </div>
    ) : (
        <EmptyState
            title="Belum ada sesi absensi"
            description="Sesi yang Anda buat akan muncul di sini."
        />
    );
}
export function PaginationControls<T>({
    pagination,
}: {
    pagination: Pagination<T>;
}) {
    if (pagination.last_page <= 1) return null;
    return (
        <div className="pagination">
            <span className="muted">
                Halaman {pagination.current_page} dari {pagination.last_page} ·{" "}
                {pagination.total} data
            </span>
            <div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.prev_page_url}
                    onClick={() =>
                        pagination.prev_page_url &&
                        router.visit(pagination.prev_page_url)
                    }
                >
                    <ArrowLeft size={16} />
                    Sebelumnya
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.next_page_url}
                    onClick={() =>
                        pagination.next_page_url &&
                        router.visit(pagination.next_page_url)
                    }
                >
                    Berikutnya
                    <ArrowRight size={16} />
                </Button>
            </div>
        </div>
    );
}
export function AttendanceTimer({
    endsAt,
    active,
}: {
    endsAt: string;
    active: boolean;
}) {
    const { serverNow } = usePage<SharedProps>().props;
    const baseline = useRef({
        server: Date.parse(serverNow),
        local: performance.now(),
    });
    const [remaining, setRemaining] = useState(0);
    const reloaded = useRef(false);
    useEffect(() => {
        baseline.current = {
            server: Date.parse(serverNow),
            local: performance.now(),
        };
    }, [serverNow]);
    useEffect(() => {
        const tick = () => {
            const seconds = Math.max(
                0,
                Math.ceil(
                    (Date.parse(endsAt) -
                        baseline.current.server -
                        (performance.now() - baseline.current.local)) /
                        1000,
                ),
            );
            setRemaining(seconds);
            if (active && seconds === 0 && !reloaded.current) {
                reloaded.current = true;
                router.reload();
            }
        };
        tick();
        const interval = window.setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [endsAt, active, serverNow]);
    return (
        <span
            className={`timer ${active && remaining <= 60 ? "timer-warning" : ""}`}
            role="timer"
            aria-label="Sisa waktu sesi"
        >
            <Clock3 size={18} />
            {active
                ? `${Math.floor(remaining / 60)
                      .toString()
                      .padStart(
                          2,
                          "0",
                      )}:${(remaining % 60).toString().padStart(2, "0")}`
                : "Sesi ditutup"}
        </span>
    );
}
export function SuccessAnimation() {
    const reduceMotion = useReducedMotion();
    return (
        <motion.div
            className="success-check"
            initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
        >
            <motion.svg
                width="42"
                height="42"
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
            >
                <motion.path
                    d="M11 24.5 20 33 37 15"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                        duration: reduceMotion ? 0 : 0.4,
                        delay: reduceMotion ? 0 : 0.1,
                    }}
                />
            </motion.svg>
        </motion.div>
    );
}
