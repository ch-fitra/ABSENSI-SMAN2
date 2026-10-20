export type AttendanceStatus = "hadir" | "izin" | "sakit" | "alpa";
export type PublicAttendanceForm = {
    id: number;
    title: string;
    starts_at: string;
    expires_at: string;
    duration_minutes: number;
    is_active: boolean;
    public_url: string;
    detail_url: string;
    responses_url: string;
    report_url: string;
    submissions_count: number;
};
export type PublicAttendanceSubmission = {
    id: number;
    student_name: string;
    class_name: string;
    subject_name: string;
    lesson_number: number;
    attendance_status: AttendanceStatus;
    notes: string | null;
    submitted_at: string;
    possible_duplicate: boolean;
};
export type PublicAttendanceFilters = {
    search?: string;
    class_name?: string;
    status?: string;
    from?: string;
    to?: string;
};
export type Summary = Record<AttendanceStatus | "total", number>;
export type SchoolClass = {
    id: number;
    name: string;
    grade_level: string;
    students_count?: number;
};
export type ChangeLog = {
    id: number;
    old_status: AttendanceStatus;
    new_status: AttendanceStatus;
    old_notes: string | null;
    new_notes: string | null;
    changed_at: string;
    teacher: { name: string };
};
export type AttendanceRecord = {
    id: number;
    student_name_snapshot: string;
    nisn_snapshot: string;
    status: AttendanceStatus | null;
    notes: string | null;
    submitted_at: string | null;
    submission_source: string | null;
    attendance_session_id: number;
    attendance_session: AttendanceSession;
    change_logs?: ChangeLog[];
};
export type AttendanceSession = {
    id: number;
    subject_name: string;
    class_name_snapshot: string;
    teacher?: { id: number; name: string };
    starts_at: string;
    ends_at: string;
    closed_at: string | null;
    confirmed_at: string | null;
    status: "active" | "review" | "confirmed";
    duration_minutes: number;
    records_count: number;
    submitted_count?: number;
    records?: AttendanceRecord[];
    correction_allowed?: boolean;
    correction_deadline?: string;
};
export type Student = {
    id: number;
    nisn: string;
    full_name: string;
    class_id: number;
    is_active: boolean;
    school_class: SchoolClass;
};
export type Pagination<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
export type Filters = {
    from?: string;
    to?: string;
    class_id?: string;
    subject?: string;
    status?: string;
    search?: string;
};
export type SharedProps = {
    auth: {
        role: "teacher" | "student" | null;
        user: {
            id: number;
            name: string;
            email?: string;
            nisn?: string;
            class_name?: string;
        } | null;
    };
    flash: { success?: string };
    serverNow: string;
    errors: Record<string, string>;
    [key: string]: unknown;
};
