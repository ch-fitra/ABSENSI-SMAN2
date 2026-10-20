import { router, usePage, usePoll } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import type { SharedProps } from "@/types";

/** A monotonic clock anchored to the server; changing a device clock cannot extend it. */
export function useServerClock() {
    const { serverNow } = usePage<SharedProps>().props;
    const [clock, setClock] = useState(() => Date.parse(serverNow));
    useEffect(() => {
        const base = Date.parse(serverNow);
        const start = performance.now();
        const tick = () => setClock(base + performance.now() - start);
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [serverNow]);
    return clock;
}

export function usePublicFormPolling(expiresAt: string, only: string[]) {
    const clock = useServerClock();
    const active = clock < Date.parse(expiresAt);
    const { start, stop } = usePoll(10000, { only }, { autoStart: false });
    const polling = useRef({ start, stop });
    polling.current = { start, stop };
    const requestedProps = useRef(only);
    requestedProps.current = only;
    const wasActive = useRef(active);
    useEffect(() => {
        if (active) polling.current.start();
        else polling.current.stop();
        if (wasActive.current && !active)
            router.reload({ only: requestedProps.current });
        wasActive.current = active;
        return () => polling.current.stop();
    }, [active]);
    return { clock, active };
}

export function wibDate(value: string | number) {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
}
export function wibTime(value: string | number) {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(value));
}
