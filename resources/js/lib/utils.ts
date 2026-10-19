import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
export const formatDate = (value: string, withTime = true) =>
    new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(value)) + (withTime ? " WIB" : "");
export const sessionLabels = {
    active: "Sedang berlangsung",
    review: "Menunggu konfirmasi",
    confirmed: "Terkonfirmasi",
};
export function queryString(filters: object) {
    return new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== "" && v != null),
    ).toString();
}
