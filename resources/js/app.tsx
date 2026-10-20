import "../css/app.css";
import "../css/experience.css";
import "../css/public-attendance.css";
import "../css/select.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { NetworkFeedback } from "./components/network-feedback";

const pages = import.meta.glob("./pages/**/*.tsx");
createInertiaApp({
    title: (title) => `${title} · Absensi SMAN 2`,
    resolve: (name) => pages[`./pages/${name}.tsx`](),
    setup({ el, App, props }) {
        createRoot(el).render(
            <MotionConfig reducedMotion="user">
                <App {...props} />
                <NetworkFeedback />
            </MotionConfig>,
        );
    },
    progress: { color: "#ED914C", showSpinner: false },
});
