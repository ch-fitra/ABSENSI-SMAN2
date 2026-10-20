import { Clock3 } from "lucide-react";
import PublicAttendanceLayout from "@/layouts/public-attendance-layout";

export default function Notice({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <PublicAttendanceLayout title={title}>
            <section className="panel public-notice">
                <span className="public-notice-icon">
                    <Clock3 size={34} />
                </span>
                <h1>{title}</h1>
                <p className="muted">{description}</p>
            </section>
        </PublicAttendanceLayout>
    );
}
