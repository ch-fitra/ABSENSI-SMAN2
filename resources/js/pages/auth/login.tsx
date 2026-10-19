import { Head, Link, useForm } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Eye,
    EyeOff,
    GraduationCap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { Brand, Field, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function Login({ role }: { role: "teacher" | "student" }) {
    const teacher = role === "teacher";
    const [visible, setVisible] = useState(false);
    const form = useForm({ email: "", password: "", nisn: "" });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) =>
            teacher
                ? { email: data.email, password: data.password }
                : { nisn: data.nisn },
        );
        form.post(teacher ? "/guru/masuk" : "/siswa/masuk", {
            onFinish: () => form.reset("password"),
        });
    }
    return (
        <div className="login-page">
            <Head title={teacher ? "Masuk Guru" : "Masuk Siswa"} />
            <div className="login-story">
                <Brand />
                <div>
                    <span className="eyebrow">SMAN 2 RANTAU SELATAN</span>
                    <h1>
                        {teacher ? (
                            <>
                                Mendampingi.
                                <br />
                                Menginspirasi.
                                <br />
                                <em>Setiap hari.</em>
                            </>
                        ) : (
                            <>
                                Datang dengan
                                <br />
                                semangat.
                                <br />
                                <em>Pulang dengan ilmu.</em>
                            </>
                        )}
                    </h1>
                    <p>
                        {teacher
                            ? "Mulai absensi dalam beberapa langkah sederhana. Lebih banyak waktu untuk mengajar."
                            : "Satu langkah kecil untuk memulai hari belajar yang berarti."}
                    </p>
                </div>
                <span className="login-story-footer">
                    Hadir. Belajar. Bertumbuh.
                </span>
            </div>
            <main className="login-main">
                <Link href="/" className="back-link">
                    <ArrowLeft size={17} />
                    Kembali ke beranda
                </Link>
                <motion.div
                    className="login-form-wrap"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <span className="login-icon">
                        {teacher ? (
                            <BookOpen size={27} />
                        ) : (
                            <GraduationCap size={29} />
                        )}
                    </span>
                    <span className="eyebrow">
                        PORTAL {teacher ? "GURU" : "SISWA"}
                    </span>
                    <h1>
                        {teacher
                            ? "Selamat datang kembali."
                            : "Halo, siap belajar?"}
                    </h1>
                    <p className="muted">
                        {teacher
                            ? "Masuk untuk memulai dan mengelola absensi kelas."
                            : "Masukkan NISN yang terdaftar di sekolah."}
                    </p>
                    <form onSubmit={submit} className="form-stack">
                        {teacher ? (
                            <>
                                <Field label="Email" error={form.errors.email}>
                                    <input
                                        type="email"
                                        autoComplete="username"
                                        required
                                        autoFocus
                                        value={form.data.email}
                                        onChange={(e) =>
                                            form.setData(
                                                "email",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="nama@sekolah.sch.id"
                                    />
                                </Field>
                                <Field
                                    label="Password"
                                    error={form.errors.password}
                                >
                                    <span className="password-wrap">
                                        <input
                                            type={visible ? "text" : "password"}
                                            autoComplete="current-password"
                                            required
                                            value={form.data.password}
                                            onChange={(e) =>
                                                form.setData(
                                                    "password",
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Masukkan password"
                                        />
                                        <button
                                            type="button"
                                            aria-label={
                                                visible
                                                    ? "Sembunyikan password"
                                                    : "Tampilkan password"
                                            }
                                            onClick={() => setVisible(!visible)}
                                        >
                                            {visible ? (
                                                <EyeOff size={19} />
                                            ) : (
                                                <Eye size={19} />
                                            )}
                                        </button>
                                    </span>
                                </Field>
                            </>
                        ) : (
                            <Field
                                label="NISN"
                                hint="Nomor Induk Siswa Nasional terdiri dari 10 digit."
                                error={form.errors.nisn}
                            >
                                <input
                                    autoFocus
                                    inputMode="numeric"
                                    autoComplete="username"
                                    pattern="[0-9]{10}"
                                    maxLength={10}
                                    required
                                    value={form.data.nisn}
                                    onChange={(e) =>
                                        form.setData(
                                            "nisn",
                                            e.target.value.replace(/\D/g, ""),
                                        )
                                    }
                                    placeholder="Masukkan 10 digit NISN"
                                />
                            </Field>
                        )}
                        <Button
                            type="submit"
                            className="full-width"
                            disabled={form.processing}
                        >
                            {form.processing ? (
                                <Loading text="Sedang masuk…" />
                            ) : (
                                <>
                                    Masuk sebagai {teacher ? "Guru" : "Siswa"}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="login-help">
                        {teacher
                            ? "Lupa password? Hubungi pengelola server sekolah untuk mengatur ulang akun Anda."
                            : "NISN belum terdaftar? Hubungi guru untuk memeriksa data Anda. Gunakan NISN milik sendiri."}
                    </div>
                    <p className="login-switch">
                        {teacher ? "Anda seorang siswa?" : "Anda seorang guru?"}{" "}
                        <Link href={teacher ? "/siswa/masuk" : "/guru/masuk"}>
                            Masuk di sini <ArrowRight size={14} />
                        </Link>
                    </p>
                </motion.div>
                <small className="login-copyright">
                    SMAN 2 Rantau Selatan · Portal Absensi
                </small>
            </main>
        </div>
    );
}
