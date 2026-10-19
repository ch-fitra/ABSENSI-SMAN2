import { useForm, usePage } from "@inertiajs/react";
import { Save, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import AppLayout from "@/layouts/app-layout";
import { Errors, Field, Loading, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { SharedProps } from "@/types";

export default function Settings() {
    const { auth } = usePage<SharedProps>().props;
    const form = useForm({
        name: auth.user?.name ?? "",
        email: auth.user?.email ?? "",
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    function submit(e: FormEvent) {
        e.preventDefault();
        form.put("/guru/pengaturan", {
            onSuccess: () =>
                form.reset(
                    "current_password",
                    "password",
                    "password_confirmation",
                ),
        });
    }
    return (
        <AppLayout title="Pengaturan">
            <PageHeader
                eyebrow="AKUN PRIBADI"
                title="Pengaturan akun"
                description="Perbarui profil dan password akun guru Anda."
            />
            <section className="panel narrow-panel">
                <div className="section-heading">
                    <h2>Informasi akun</h2>
                    <ShieldCheck size={20} className="muted" />
                </div>
                <form onSubmit={submit} className="form-stack">
                    <Errors errors={form.errors} />
                    <div className="form-grid">
                        <Field label="Nama lengkap">
                            <input
                                required
                                maxLength={150}
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData("name", e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Email">
                            <input
                                type="email"
                                required
                                maxLength={255}
                                autoComplete="username"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData("email", e.target.value)
                                }
                            />
                        </Field>
                    </div>
                    <Field
                        label="Password saat ini"
                        hint="Diperlukan untuk menyimpan perubahan akun."
                    >
                        <input
                            type="password"
                            autoComplete="current-password"
                            required
                            value={form.data.current_password}
                            onChange={(e) =>
                                form.setData("current_password", e.target.value)
                            }
                        />
                    </Field>
                    <div className="form-grid">
                        <Field
                            label="Password baru (opsional)"
                            hint="Tidak ada batas minimal panjang password."
                        >
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password}
                                onChange={(e) =>
                                    form.setData("password", e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Ulangi password baru">
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password_confirmation}
                                onChange={(e) =>
                                    form.setData(
                                        "password_confirmation",
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>
                    <div className="form-footer">
                        <Button disabled={form.processing}>
                            {form.processing ? (
                                <Loading />
                            ) : (
                                <>
                                    <Save size={17} />
                                    Simpan Pengaturan
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </section>
        </AppLayout>
    );
}
