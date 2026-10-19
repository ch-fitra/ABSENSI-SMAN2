import { Link } from "@inertiajs/react";
import { ArrowRight } from "lucide-react";
import { EmptyState, StatusBadge } from "./shared";
import { formatDate } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";
export function StudentRecords({ records }: { records: AttendanceRecord[] }) {
    return records.length ? (
        <div>
            {records.map((record) => (
                <Link
                    href={`/siswa/absensi/${record.attendance_session_id}`}
                    className="history-record"
                    key={record.id}
                >
                    <div>
                        <h3>{record.attendance_session.subject_name}</h3>
                        <p>
                            {record.attendance_session.teacher?.name} ·{" "}
                            {record.attendance_session.class_name_snapshot} ·
                            Sesi #{record.attendance_session_id}
                        </p>
                        {record.notes && (
                            <p className="record-notes">{record.notes}</p>
                        )}
                    </div>
                    <div className="history-record-end">
                        <small className="muted">
                            {formatDate(record.attendance_session.starts_at)}
                        </small>
                        <StatusBadge status={record.status} />
                        <ArrowRight size={16} />
                    </div>
                </Link>
            ))}
        </div>
    ) : (
        <EmptyState
            title="Belum ada hasil terkonfirmasi"
            description="Hasil resmi akan tampil setelah guru memeriksa dan mengonfirmasi kehadiran Anda."
        />
    );
}
